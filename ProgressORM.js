

 module.exports = class ProgressORM{

    #schemas;
    #schemaPath;
    #sequenceMap;
    #overrideSchemaStrict;

    constructor(opts){
        return this.#init(opts)
    }

    async #init({ dbName,
                  dbo, //needed for schema gathering
                  schemaOwner,
                  schemaPath,
                  dateFormat,
                  dateTimeFormat,
                  timeFormat,
                  overrideSchemaStrict,
                  schemaOptions
                }){
        if(!dbo || typeof dbo !== 'object')
            throw `"dbo" must be provided. It is needed to get schema`

        if(!dbName)
            throw `"dbName" must be provided`


        this.schemaOwner = schemaOwner || 'PUB'    
        this.dbName = dbName;
        this.type = 'progress';
        this.schemaOptions = schemaOptions || {
            plantid:0
        };
        this.moment = require('moment')            
        this.dateFormat = dateFormat || 'YYYY-MM-DD'; //used alongside moment
        this.dateTimeFormat = dateTimeFormat || 'YYYY-MM-DD HH:mm:ss';
        this.timeFormat = timeFormat || 'HHmm';
        this.#overrideSchemaStrict = overrideSchemaStrict || false; //if true then after schema is overriden then it will remove additional fields 
        this.#schemas = {}
        this.#schemaPath =  schemaPath || `./schemas/progress/${this.dbName.toLowerCase()}/`
        if(!this.#schemaPath.endsWith('/'))
            this.#schemaPath += '/';
            
        this.#sequenceMap = require(`./schemas/progress/${this.dbName.toLowerCase()}/tableSequenceMap.json`); //used by getSchema utomatically figure out ID fields

        await this.#populateSchema(dbo);
        return this;
    }

    

    async #populateSchema(dbo){
        let allFields = await dbo.sql(`SELECT fd."_field-name" AS 'field', fd."_data-type" AS 'dbType', 
                                    fd."_Extent" AS 'ArrayExtent'
                                    ,(case  fd."_data-type"
                                        when 'bit' then 'boolean'
                                        when 'varchar' then 'string'
                                        when 'char' then 'string'
                                        when 'nvarchar' then 'string'
                                        when 'date' then 'date'
                                        when 'datetime' then 'datetime'
                                        when 'datetimeoffset' then 'datetime'
                                        when 'int' then 'integer'
                                        when 'bigint' then 'integer'
                                        when 'numeric' then 'decimal'
                                        when 'character' then 'string'
                                        when 'clob' then 'string'
                                        when 'integer' then 'integer'
                                        when 'int64' then 'integer'
                                        when 'decimal' then 'decimal'
                                        when 'logical' then 'boolean'
                                        else '} deliberately breaking'
                                    END) as 'type'
                                    ,f."_file-name" as 'table'                   
                                    FROM ${this.schemaOwner}."_field" fd 
                                    INNER JOIN ${this.schemaOwner}."_file" f ON fd."_file-recid" = f.ROWID 
                                    WHERE f."_Hidden" = 0 
                                    order by  f."_file-name"
                                    with (nolock)`)
        for(let item of allFields){
            let table = this.#schemas[item.table];

            if(!table)
                table = this.#schemas[item.table] = {};

            if(item.ArrayExtent > 0) //we are NOT handling array type fields
                continue;

            let seqName = this.#getSequenceNameForID(item.table,item)
            if(seqName){    
                item.preventUpdate = true;
                item.preventInsert = true;
                item.insertSequence = seqName
            }

            delete item.table;

            switch(item.field){
                case 'CreateDateTime': 
                    item = { field: 'CreateDateTime', type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true }
                    break;

                case 'ModifyDateTime': case 'ChangeDT':  
                    item = { field: 'ModifyDateTime',type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP', preventSelection: true }
                    break;                            

                case 'PlantId':
                    item = { field: 'PlantId',type: 'integer', defaultValueOnInsert: this.schemaOptions.plantid }
                    break; 
                         
            }         

            table[item.field] = item;

        }

        await this.#applySchemaOverrides();

    } 

    async #applySchemaOverrides(){

        for(let tableName in this.#schemas){
             let table = this.#schemas[tableName]

              try{

                let override = require(`${this.#schemaPath}${tableName}`)(this.schemaOptions) //only require based on 
                let fieldsToDel = [];
                for(let fieldName in override){

                    if(fieldName == '_nvp')
                        continue;

                    if(!table[fieldName]){
                        fieldsToDel.push(fieldName);
                        continue;
                    }
                    table[fieldName] = override[fieldName];
                }

                for(let fieldName of fieldsToDel)
                    delete override[fieldName];

                if(this.#overrideSchemaStrict){

                    fieldsToDel = [];    

                    for(let fieldName in table){
                    
                        if(!override[fieldName])
                            fieldsToDel.push(fieldName);
    
                    }
    
                    for(let fieldName of fieldsToDel)
                        delete table[fieldName];

                }
                
                if(override._nvp){
                    table._nvp = override._nvp; //nvp schema
                }
               

              }catch(ex){}

        }

    }
    
    #getSequenceNameForID(tableName,item){
        let seqName = '';
        if(this.#sequenceMap[tableName]) {
            seqName = this.#sequenceMap[tableName][item.field] || '';
        }
        return seqName;
    }
   

    getSchema(schema){
        if(!this.#schemas[schema])
            throw `Unable to find schema for ${schema}`

        return JSON.parse(JSON.stringify(this.#schemas[schema])) //we always should return the copy of schema so that it won't get mutated
    }

    getDateTimeFromDateAndTime(dt,t){
        if(!dt || !t)
            return null;

        let dat, time,moment = this.moment;

        if(dt instanceof Date || dt instanceof moment)
            dat = moment(dt).format('YYYY-MM-DD')

        else 
            dat = dt; 
        
        if(t instanceof Date || t instanceof moment)
            time = moment(t).format('HH:mm:ss')
        else 
            time = t;   
        
        
        if(!time.includes(':')){

            if(time.length == 4)
                time = time.substr(0,2) + ':' + time.substr(2,2) + ':00';

            else if(time.length == 6)
                time = time.substr(0,2) + ':' + time.substr(2,2) + ':' + time.substr(4,2);
                
        }
        
        return `${dat} ${time}`;
    }

    escape(str){  //used for putting quotes in queries
         
        let strMagic = function(s){
            if(s == 'null' || s == 'undefined')
                s = '';
            s = s.replace(/'/g, "''");               
            return s;
        }

        if(typeof str === 'object'){
            for(let prop in str){                   

                if(typeof str[prop] === 'string')
                    str[prop] = strMagic(str[prop]) //removing quotes
                else if(typeof str[prop] === 'undefined' || str[prop] === null)
                    str[prop] = '';
            }
            return str;
        }else if(typeof str === 'string')               
            return strMagic(str); //removing quotes
        else if(typeof str === 'undefined' || str === null)
            str = '';    

        return str;
    }

    #readWithSchema(fieldValue,obj,fieldModel,mode = 'insert',putQuotes = true){
        const moment = this.moment;
        //Do advance validation here if needed
        //for instance {value:"2.3",type:"decimal"} then we will return parseFloat(fieldModel.value)
        //example 2 {value}

        if(mode == 'insert' && fieldModel.insertSequence && (fieldValue == null || fieldModel.preventInsert)){
            return `(Select ${this.schemaOwner}."${fieldModel.insertSequence}".NextVal As '${fieldModel.insertSequence}' From SysProgress.Syscalctable)`;
        } 

        if(fieldModel.preventUpdate && mode == 'update')                
            return null;
        else if(fieldModel.preventInsert && mode == 'insert')                
            return null;
            
        
        if(!fieldModel.type){
            fieldModel.type = 'any'
            // if(fieldModel instanceof Date){
            //     fieldModel = {type:'date',value:moment(fieldModel).format(this.dateFormat)}
            // }else if(fieldModel instanceof moment)
            //     fieldModel = {type:'date',value:fieldModel.format(this.dateFormat)}
            // else
            //     fieldModel.type = 'string';
        }

        if(!fieldModel.alternatives)
            fieldModel.alternatives = [];

        if(typeof fieldValue == 'undefined'){
            for(let alt of fieldModel.alternatives){
                if(typeof obj[alt] !== 'undefined'){
                     fieldValue = obj[alt];
                     break;
                }
            }
            if(typeof fieldValue == 'undefined'){ //if it is still undefined then return
                
                if(mode == 'insert' && typeof fieldModel.defaultValueOnInsert !== 'undefined')
                      fieldValue = fieldModel.defaultValueOnInsert;

                else if(mode == 'update' && typeof fieldModel.defaultValueOnUpdate !== 'undefined')
                      fieldValue = fieldModel.defaultValueOnUpdate;

                else
                     return null;
            } 
                
        }

        if(fieldModel.type == 'any'){
            fieldModel = this.#determineFieldModel(fieldValue);
        }

       

        let quote = putQuotes?`'`:``;

        switch(fieldModel.type){
            case 'date':
                fieldModel.format = fieldModel.format || this.dateFormat;
                if(!fieldValue)
                    return null;
                else if(fieldValue instanceof Date){
                    return `${quote}${moment(fieldValue).format(fieldModel.format)}${quote}`

                }else if(fieldValue instanceof moment)
                    return `${quote}${fieldValue.format(fieldModel.format)}${quote}`
                else if(fieldValue === 'SYSTIMESTAMP')
                    return `${quote}${moment().format(fieldModel.format)}${quote}`
                else    
                    return `${quote}${fieldValue}${quote}`;
                break;
            case 'datetime':
                fieldModel.format = fieldModel.format || this.dateTimeFormat;
                if(!fieldValue)
                    return null;
                else if(fieldValue instanceof Date){
                    return `${quote}${moment(fieldValue).format(fieldModel.format)}${quote}`

                }else if(fieldValue instanceof moment)
                    return `${quote}${fieldValue.format(fieldModel.format)}${quote}`
                else if(fieldValue === 'SYSTIMESTAMP')
                    return `${fieldValue}`   
                else{                    
                    //return `${quote}${fieldValue}${quote}`;
                    return `${quote}${moment(fieldValue).format(fieldModel.format)}${quote}`
                }
                    
                break;
            case 'time':
                fieldModel.format = fieldModel.format || this.timeFormat;
                if(!fieldValue)
                    return null;
                else if(fieldValue instanceof Date){
                    return `${quote}${moment(fieldValue).format(fieldModel.format)}${quote}`

                }else if(fieldValue instanceof moment)
                    return `${quote}${fieldValue.format(fieldModel.format)}${quote}`
                else if(fieldValue === 'SYSTIMESTAMP')
                    return `${quote}${moment().format(fieldModel.format)}${quote}`
                else
                    return `${quote}${fieldValue}${quote}`;
                break;
            case 'integer':                
                if(fieldValue == null)
                    return null;
                else if(typeof fieldValue == 'string' && !fieldValue.trim())
                    return null;
                    
                return parseInt(fieldValue)    
                break; 
            case 'decimal':
                    if(fieldValue == null)
                        return null;
                    else if(typeof fieldValue == 'string' && !fieldValue.trim())
                        return null;
                    return parseFloat(fieldValue)    
                    break; 
            case 'boolean':
                if(fieldValue == null)
                    return null;
                if(typeof fieldValue !== 'boolean'){
                    fieldValue = fieldValue + '';
                    fieldValue = (['y','yes','1','true'].includes(fieldValue.toLowerCase()))?true:false;
                } 
                return `${quote}${(fieldValue)?1:0}${quote}`;
                break;   
            default: //default should be string
                if(fieldValue == null)
                    return null;
                return `${quote}${this.escape(fieldValue)}${quote}`;
                
                break;
        }
        
    }

    #determineFieldModel(val){     
        const moment = this.moment;
        let fieldModel = {type:'string',alternatives:[]}


        if(val instanceof Date){
            fieldModel.type = 'date';

        }else if(val instanceof moment){

            fieldModel.type = 'date';

        }else if(typeof val == "boolean")

          fieldModel.type = 'boolean';

        else if(typeof val == "number"){

            if(val % parseInt(val) == 0) 
                fieldModel.type = 'integer';
            else 
                fieldModel.type = 'decimal';
        }
        
        
        return fieldModel;
    }

    nvpToObject(n) {
        if(!n) return {};           
        var a = n.split('\u0002'), o = {}, s = [];
        for (var i = 0; i < a.length; i++) {
            s = a[i].split('=');
            if (s.length == 2)
                o[s[0].toLowerCase()] = s[1];
        }
        return o;
    }

    objectToNvp(obj){
        let nvp = [];
        for(let prop in obj){
            let item = obj[prop];
            if(typeof item == 'undefined' || typeof item == 'object' || typeof item == 'function'){
                //nvp.push(prop.toLowerCase() + '=');
                continue;
            }
            nvp.push(prop.toLowerCase() + '=' + item);
        }
        return nvp.join('\u0002')
    }

    normalizeNVPFields(obj,schema){

        if(typeof schema === 'string')
            schema = this.getSchema(schema);
            
        let nvpSchema = schema?schema._nvp:null;

        if(!nvpSchema)  //schema is NOT defined for NVP fields so we cannot manipulate it :(
            return obj

          
        let NVP = this.nvpToObject(obj.NameValuePairs)
        let FinalNVP = {};

        for(let prop in nvpSchema){

            let fieldSchema = nvpSchema[prop];
            if(typeof fieldSchema === 'string')
                fieldSchema = {type:fieldSchema}

            let nvpProp = fieldSchema.nvpname?fieldSchema.nvpname.toLowerCase():prop;

            let fieldValue = NVP[nvpProp];
            if(typeof fieldValue === 'undefined' && typeof NVP[nvpProp.toLowerCase()] !== 'undefined'){ //it means NVP Field case is different
                fieldValue =  NVP[nvpProp.toLowerCase()];
            }

            if(typeof fieldValue == 'undefined')
                continue;

            switch(fieldSchema.type){
                // case 'date':

                //     break;
                // case 'datetime': 

                //     break;
                // case 'time':

                //     break;
                case 'integer':                        
                    fieldValue = parseInt(fieldValue)    
                    break; 
                case 'decimal':                           
                    fieldValue =  parseFloat(fieldValue)    
                    break; 
                case 'boolean':                        
                    fieldValue =  (['y','yes','1','true'].includes(fieldValue.toLowerCase()))?true:false;
                    break;   
            }
            FinalNVP[prop] = fieldValue;
        }

        obj = Object.assign(obj,FinalNVP);

        // if(!['OrderHeader','OrderDetail','PalletHeader'].includes(schemaName)) //because order header has too man NVP fields that are NOT used in Nimbus
        //     delete obj.NameValuePairs;
        return obj;
    }

    #copy(params){
        let moment = this.moment;
        let obj = {}; //let obj = JSON.parse(JSON.stringify(params))//copying

        for(let i in params){
            let val = params[i];
            if(typeof val === 'object'){
                if(val instanceof moment)
                    obj[i] = val.clone();
                else if(val instanceof Date)
                    obj[i] = new Date(val.getTime());
                else
                    obj[i] = JSON.parse(JSON.stringify(val));
            }else
                obj[i] = params[i];
                
            
        }
        return obj;
    }

    #checkRequiredStatus(prop,val,fieldModel,requiredFails,mode = 'insert'){

        if(mode == 'insert' && fieldModel.requiredOnInsert && !fieldModel.preventInsert){

            if(val == null || (val === "''" && fieldModel.type === 'string'))
                requiredFails.push(prop)
                
        }else if(mode == 'update' && fieldModel.requiredOnUpdate && !fieldModel.preventUpdate){

            if(val == null || (val === "''" && fieldModel.type === 'string'))
                requiredFails.push(prop)

        }
            
    }

    //reason needed it to gracefully handle nulls and other invalid data types from insert quries 
    //use it for complex insert statments For rudementary inserts with less fields I would prefer
    //old school way but it still works
    generateInsertQueryDataHelper(params,schema){ 
        let obj = this.#copy(params);
        let fields = [],values = []; 
        let val = '',fieldModel,requiredFails = [];

        let processField = (prop) => {
            if(prop == 'NameValuePairs')
                return;

            if(typeof fieldModel === 'string')
                fieldModel = {type:fieldModel}

            val = this.#readWithSchema(val,obj,fieldModel,'insert')

            this.#checkRequiredStatus(prop,val,fieldModel,requiredFails,'insert')

            if(val == null){
                delete obj[prop]; //null will be discarded
                return;
             }

            values.push(val)
            fields.push(`"${prop}"`);
        }

        let processNVPField = (nvpFields) => {

            let NVPObject = {};

            if(obj.NameValuePairs)
                NVPObject = this.nvpToObject(obj.NameValuePairs)

            for(let prop in nvpFields){
                
                fieldModel = nvpFields[prop]
                
                val = obj[prop];

                if(typeof fieldModel === 'string')
                    fieldModel = {type:fieldModel}

                val = this.#readWithSchema(val,nvpFields,fieldModel,'insert',false)

                this.#checkRequiredStatus(prop,val,fieldModel,requiredFails,'insert')

                if(val == null){
                    delete nvpFields[prop]; //null will be discarded
                    continue;
                }
                
                if(fieldModel.nvpname)
                    prop = fieldModel.nvpname;
                
                delete NVPObject[prop.toLowerCase()];
                NVPObject[prop] = val;
            }


            val = this.objectToNvp(NVPObject);
            values.push(val)
            fields.push(`"NameValuePairs"`);
        }

        if(schema){

            if(schema instanceof Array){
                
                fieldModel = {type:'any'};
                for (let prop of schema){

                    val = obj[prop];
                    processField(prop);
                }

            }else{
                for (let prop in schema){

                    val = obj[prop];
                    fieldModel = schema[prop];
                    processField(prop);
                }
            }


        }else{

            for (let prop in obj){
              
                if(prop === '_nvp'){
                    processNVPField(schema[prop])
                    continue;
                }   
                val = obj[prop];
                fieldModel = this.#determineFieldModel(val)
                processField(prop);
            }

        }

        if(requiredFails.length){
            throw {
                code:'MISSING_REQUIRED_PARAM',
                message:`Missing required params: ${requiredFails.join(',')}`,
                data:requiredFails
            }
        }
        
        fields = fields.join(',')
        values = values.join(',')
        return {fields,values}
    }

    generateUpdateQueryDataHelper(params,schema){ 
        let obj = this.#copy(params);
        let updateSqlStr = '';
        let val = '',fieldModel,requiredFails = [];

        let processField = (prop) => {
            if(prop == 'NameValuePairs')
                return;

            if(typeof fieldModel === 'string')
                fieldModel = {type:fieldModel}    

            val = this.#readWithSchema(val,obj,fieldModel,'update')

            this.#checkRequiredStatus(prop,val,fieldModel,requiredFails,'update')

            if(val == null){
               delete obj[prop]; //null will be discarded
               return;
            }

            if(updateSqlStr.length)    
                updateSqlStr += ', '
            updateSqlStr += ` "${prop}" = ${val} `; 
        }

        let processNVPField = (nvpFields) => {

            let NVPObject = {};

            if(obj.NameValuePairs)
                NVPObject = this.nvpToObject(obj.NameValuePairs)

            for(let prop in nvpFields){
                
                fieldModel = nvpFields[prop]
                
                val = obj[prop];

                if(typeof fieldModel === 'string')
                    fieldModel = {type:fieldModel}

                val = this.#readWithSchema(val,nvpFields,fieldModel,'update',false)

                this.#checkRequiredStatus(prop,val,fieldModel,requiredFails,'update')

                if(val == null){
                    delete nvpFields[prop]; //null will be discarded
                    continue;
                }
                
                if(fieldModel.nvpname)
                    prop = fieldModel.nvpname;
                
                delete NVPObject[prop.toLowerCase()];
                NVPObject[prop] = val;
            }


            val = this.objectToNvp(NVPObject);
            if(!val.length)
                return;
            if(updateSqlStr.length)    
                updateSqlStr += ', '
            updateSqlStr += ` "NameValuePairs" = '${val}' `; 
        }

        if(schema){

            if(schema instanceof Array){
                
                fieldModel = {type:'any'};
                for (let prop of schema){

                    val = obj[prop];
                    processField(prop);
                }

            }else{
                for (let prop in schema){
                    if(prop === '_nvp'){
                        processNVPField(schema[prop])
                        continue;
                    }                        
                    val = obj[prop];
                    fieldModel = schema[prop];
                    processField(prop);
                }
            }


        }else{

            for (let prop in obj){
              
                val = obj[prop];
                fieldModel = this.#determineFieldModel(val)
                processField(prop);
            }

        }

        if(requiredFails.length){
            throw {
                code:'MISSING_REQUIRED_PARAM',
                message:`Missing required params: ${requiredFails.join(',')}`,
                data:requiredFails
            }
        }
       
        return updateSqlStr;
    }

    makeSQLSelector(schema,prefix){
        if(typeof schema === 'string')
            schema = this.getSchema(schema)

        prefix = (prefix)?prefix + '.':'';
            
        if(Array.isArray(schema)){
            return schema.map(fieldName => `${prefix}"${fieldName}"`).join(',')
        }

        let fields = [];
        for(let fieldName in schema){

            if(fieldName == '_nvp'){ //handling NameValuePairs field
                if(!schema['NameValuePairs']){
                    fields.push(`${prefix}"NameValuePairs"`);
                }
                continue;     
            }

            let type = schema[fieldName]; 
            if(typeof type === 'object'){
                if(type.preventSelection) //means our schema has defined that we don't want this field to apear in select clause
                    continue;
                type = type.type;
            }
            
            switch(type){
                // case 'date': fieldName = `convert(varchar, ${prefix}"${fieldName}", 23) as '${fieldName}'`; break;
                // case 'datetime': fieldName = `convert(varchar, ${prefix}"${fieldName}", 121) as '${fieldName}'`; break;
                case 'string': fieldName = `IFNULL(${prefix}"${fieldName}",'') as '${fieldName}'`;break;
                default: fieldName = `${prefix}"${fieldName}"`;break;
            }
            fields.push(fieldName);

        }
        return fields.join(',')

    }

    generateSimpleWhereClause(params,inputSchema){

            if(typeof inputSchema === 'string')
                inputSchema = this.getSchema(inputSchema)

            let schema = this.#copy(inputSchema);


            let obj = this.#copy(params);

            let whereSqlStr = '';
            let val = '',fieldModel;

            let processField = (prop) => {
                if(prop == 'NameValuePairs')
                    return;
                  
                if(typeof fieldModel === 'string')
                    fieldModel = {type:fieldModel}    

                val = this.#readWithSchema(val,obj,fieldModel,'whereclause')

                if(val == null){
                    delete obj[prop]; //null will be discarded
                    return;
                }

                if(whereSqlStr.length)    
                    whereSqlStr += ' AND '
                whereSqlStr += ` "${prop}" = ${val} `; 
            }

            let processNVPField = (nvpFields) => {

                let NVPObject = {};
    
                if(obj.NameValuePairs)
                    NVPObject = this.nvpToObject(obj.NameValuePairs)
    
                for(let prop in nvpFields){
                    
                    fieldModel = nvpFields[prop]
                    
                    val = obj[prop];
    
                    if(typeof fieldModel === 'string')
                        fieldModel = {type:fieldModel}
    
                    val = this.#readWithSchema(val,nvpFields,fieldModel,'update',false)    
                       
                    if(val == null){
                        delete nvpFields[prop]; //null will be discarded
                        continue;
                    }
                    
                    if(fieldModel.nvpname)
                        prop = fieldModel.nvpname;
                    
                    delete NVPObject[prop.toLowerCase()];
                    NVPObject[prop] = val;
                }
    
                
                let str = '';    
                for(let key in NVPObject){

                    if(str.length)    
                        str += ' AND '

                    str += `"NameValuePairs" LIKE '%${key}=${NVPObject[key]}%'`
                }
                
                if(str.length){

                    if(whereSqlStr.length)    
                        whereSqlStr += ' AND '

                    whereSqlStr += ` (${str}) `; 

                }
                
            }

            if(schema){

                if(schema instanceof Array){
                    
                    fieldModel = {type:'any'};
                    for (let prop of schema){

                        val = obj[prop];
                        processField(prop);
                    }

                }else{
                    
                    for (let prop in schema){

                        if(prop === '_nvp'){
                            processNVPField(schema[prop])
                            continue;
                        }   

                        val = obj[prop];
                        fieldModel = schema[prop];
                        processField(prop);
                    }
                }


            }else{

                for (let prop in obj){
                
                    val = obj[prop];
                    fieldModel = this.#determineFieldModel(val)
                    processField(prop);
                }

            }

            if(whereSqlStr.length)
                whereSqlStr = `WHERE ${whereSqlStr}`
        
            return whereSqlStr;
    }

    async getNextSeq  (dbo,seqName) {

        let data = await dbo.sql(`select ${this.schemaOwner}."${seqName}".nextVal as "${seqName}" from Sysprogress.Syscalctable`)  
        if(data.length){
            return data[0][seqName];
        }else{
            throw "Invalid Sequence"
        }  
    }

    async readOne(dbo, tableName, query,schema)  {

        if(!schema)
            schema = await this.getSchema(tableName) 
      
        let where = this.generateSimpleWhereClause(query,schema);

        if(!where.startsWith('WHERE '))
            throw {code:'PROVIDE_FILTER_CRITERIA',message: `Please provide valid filter criteria`}

        let result = await dbo.sql(`SELECT top 1 ${orm.makeSQLSelector(schema)} 
                   FROM ${this.schemaOwner}."${tableName}" 
                   ${where}
                   with (nolock)
                   `)
        result = (result.length)?result[0]:null;

        if(result && result.NameValuePairs)
            result = this.normalizeNVPFields(result,schema) //it reads from NameValuePairs field and converts it into object

        return result;
    }

    async read(dbo, tableName, query,schema)  {

        
        if(!schema)
            schema = await this.getSchema(tableName) 
          
        let where = this.generateSimpleWhereClause(query,schema);
    
        if(!where.startsWith('WHERE '))
           throw {code:'PROVIDE_FILTER_CRITERIA',message: `Please provide valid filter criteria`}
    
         let results = await dbo.sql(`SELECT ${orm.makeSQLSelector(schema)} 
                    FROM ${this.schemaOwner}."${tableName}" 
                    ${where}
                    with (nolock)
                    `)
        if(results.length && results[0].NameValuePairs){  //unfortunately we have to do this for Progress ONLY so that we can get these namevaluepairs fields addressed
            results.map(result => {
                result = this.normalizeNVPFields(result,schema)
                return result;
            })   
        }

         return results;           
    
    }        
    
    async insert(dbo, tableName, params,schema){

        if(!schema)
            schema = await this.getSchema(tableName)     
    
       let data = this.generateInsertQueryDataHelper(params, schema)
    
       return dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}" (${data.fields})  VALUES(${data.values})`);
    
    
    }
    
    async update(dbo, tableName, params, query,schema) {

                    if(!schema)
                schema = await this.getSchema(tableName)  
    
           let where = this.generateSimpleWhereClause(query,schema);
    
           if(!where.startsWith('WHERE '))
               throw {code:'PROVIDE_FILTER_CRITERIA',message: `Please provide valid filter criteria`}
    
           //archiving previous     
           //await dbo.sql(`INSERT INTO dbo."${tableName}_History" select * from dbo."${tableName}_History" ${where} `)
    
    
           let updateSqlStr = this.generateUpdateQueryDataHelper(params, schema)
    
    
           return dbo.sql(`UPDATE ${this.schemaOwner}."${tableName}" 
               SET                 
               ${updateSqlStr}
               ${where} 
               `)       
    
    }        
    
    async remove (dbo, tableName, query,schema){

        if(!schema)
            schema = await this.getSchema(tableName) 
    
       let where = this.generateSimpleWhereClause(query,schema);
    
       if(!where.startsWith('WHERE '))
           throw `Cannot delete without filter criteria`
    
     
       return dbo.sql(`DELETE FROM ${this.schemaOwner}."${tableName}" ${where}`)       
    
    }


}    


