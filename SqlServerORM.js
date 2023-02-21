
module.exports = class SqlServerORM {

   

    constructor(opts){
        this._schemas = null;
        this._schemaPath = null;
        this._sequenceMap = null;
        this._overrideSchemaStrict = null;
        this._fixNVP = null; 
        return this._init(opts)
    }

    async _init({ dbName,
                  dbo, //needed for schema gathering
                  schemaOwner,
                  schemaPath,
                  dateFormat,
                  dateTimeFormat,
                  timeFormat,
                  overrideSchemaStrict,
                  schemaOptions,
                  fixNVPs //CFS NVP fields
                }){
        if(!dbo || typeof dbo !== 'object')
            throw `"dbo" must be provided. It is needed to get schema`

        if(!dbName)
            throw `"dbName" must be provided`


        this._fixNVP = fixNVPs || false; //if true then when inserting or updating if there is NameValuePairs field and there is corresponding field in schema it will remove it from NVP and put it in real field           
        this.schemaOwner = schemaOwner || 'dbo'                    
        this.dbName = dbName;
        this.type = 'sqlserver';
        this.schemaOptions = schemaOptions || {
            plantid:0
        };
        this.moment = require('moment')            
        this.dateFormat = dateFormat || 'YYYY-MM-DD'; //used alongside moment
        this.dateTimeFormat = dateTimeFormat || 'YYYY-MM-DD HH:mm:ss';
        this.timeFormat = timeFormat || 'HH:mm:ss';
        this._overrideSchemaStrict = overrideSchemaStrict || false; //if true then after schema is overriden then it will REMOVE fields that are NOT overridden
        this._schemas = {}
        this._schemaPath =  schemaPath || `./schemas/sqlserver/${this.dbName.toLowerCase()}/`
        if(!this._schemaPath.endsWith('/'))
            this._schemaPath += '/';

        this.validDateFormats = ['MM/DD/YYYY', 'MM/DD/YY', 'M/D/YYYY', 'M/D/YY', 'YYYY-MM-DD'];

        this.validTimeFormats = ['HH:mm:ss','HH:mm','HHmm','HHmmss'];
        
        this.validDateTimeFormats = ['MM/DD/YYYY HH:mm:ss', 'MM/DD/YY HH:mm:ss', 'M/D/YYYY HH:mm:ss', 'M/D/YY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss',
                                     'MM/DD/YYYY HH:mm', 'MM/DD/YY HH:mm', 'M/D/YYYY HH:mm', 'M/D/YY HH:mm', 'YYYY-MM-DD HH:mm',
                                     'MM/DD/YYYY HHmm', 'MM/DD/YY HHmm', 'M/D/YYYY HHmm', 'M/D/YY HHmm', 'YYYY-MM-DD HHmm',
                                     'MM/DD/YYYY HHmmss', 'MM/DD/YY HHmmss', 'M/D/YYYY HHmmss', 'M/D/YY HHmmss', 'YYYY-MM-DD HHmmss'];
            
        //this._sequenceMap = require(`./schemas/sqlserver/${this.dbName.toLowerCase()}/tableSequenceMap.json`); //used by getTableSchema to automatically figure out ID fields

        await this._populateSchema(dbo);
        return this;
    }


    async _populateSchema(dbo){
        let allFields = await dbo.sql(`select c.COLUMN_NAME as 'field',c.DATA_TYPE as 'dbType', (
                                    case  c.DATA_TYPE 
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
                                        else 'string' 
                                    end) as 'type' 
                                    ,c.CHARACTER_MAXIMUM_LENGTH as 'width'
                                    ,TABLE_NAME as 'table'
                                    ,COLUMNPROPERTY(object_id(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') as 'IsID'
                                    FROM INFORMATION_SCHEMA.COLUMNS c 
                                    order by TABLE_NAME`)
        for(let item of allFields){
            let table = this._schemas[item.table];

            if(!table)
                table = this._schemas[item.table] = {};

            if(['TimeFrame','RecordSeq'].includes(item.field))
                continue;

           if(item.IsID){
               item.preventUpdate = true;
               item.preventInsert = true;
           }

           switch(item.field){
               case 'CreateDateTime': 
                   item = { field: item.field, type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true }
                   break;

               case 'ModifyDateTime': case 'ChangeDT': 
                   item = { field: item.field,type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true }
                   break;
                 
           }

            table[item.field] = item;

        }

        await this._applySchemaOverrides();

    } 

    async _applySchemaOverrides(){

        for(let tableName in this._schemas){
             let table = this._schemas[tableName]

              try{

                let override = require(`${this._schemaPath}${tableName}`)(this.schemaOptions) //only require based on 
                let fieldsToDel = [];
                for(let fieldName in override){
                    if(!table[fieldName]){
                        fieldsToDel.push(fieldName);
                        continue;
                    }
                   
                    if(typeof override[fieldName] === 'string')
                        override[fieldName] = {type:override[fieldName]}

                    table[fieldName] = {...table[fieldName],...override[fieldName]};

                }

                for(let fieldName of fieldsToDel)
                    delete override[fieldName];

                if(this._overrideSchemaStrict){

                    fieldsToDel = [];    

                    for(let fieldName in table){
                    
                        if(!override[fieldName])
                            fieldsToDel.push(fieldName);
    
                    }
    
                    for(let fieldName of fieldsToDel)
                        delete table[fieldName];

                }
               

              }catch(ex){}

        }

    }
       

    getSchema(schema){
        if(!this._schemas[schema])
            throw `Unable to find schema for ${schema}`

        return JSON.parse(JSON.stringify(this._schemas[schema])) //we always should return the copy of schema so that it won't get mutated
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

    _readWithSchema(fieldValue,obj,fieldModel,mode = 'insert'){
        const moment = this.moment;
        //Do advance validation here if needed
        //for instance {value:"2.3",type:"decimal"} then we will return parseFloat(fieldModel.value)
        //example 2 {value}

        if(mode == 'insert' && fieldModel.insertSequence && (fieldValue == null || fieldModel.preventInsert)){
            return `(NEXT VALUE FOR ${this.schemaOwner}.${fieldModel.insertSequence})`;
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
            fieldModel = this._determineFieldModel(fieldValue);
        }

       
        switch(fieldModel.type){
            case 'date':
                fieldModel.format = fieldModel.format || this.dateFormat;
                if(!fieldValue)
                    return null;

                else if(fieldValue instanceof Date){
                    return `'${moment(fieldValue).format(fieldModel.format)}'`

                }else if(fieldValue instanceof moment)
                    return `'${fieldValue.format(fieldModel.format)}'`

                else if(fieldValue === 'CURRENT_TIMESTAMP')
                    return `'${moment().format(fieldModel.format)}'`

                else if(moment(fieldValue, this.validDateFormats, false).isValid())
                    return  `'${moment(fieldValue, this.validDateFormats, false).format(fieldModel.format)}'`
                else    
                    return null;  
                break;
            case 'datetime':
                fieldModel.format = fieldModel.format || this.dateTimeFormat;
                if(!fieldValue)
                    return null;

                else if(fieldValue instanceof Date){
                    return `'${moment(fieldValue).format(fieldModel.format)}'`

                }else if(fieldValue instanceof moment)
                    return `'${fieldValue.format(fieldModel.format)}'`

                else if(fieldValue === 'getdate()' || fieldValue === 'CURRENT_TIMESTAMP')
                    return `${fieldValue}`  

                else if(fieldValue === 'CURRENT_TIMESTAMP')
                    return `'${moment().format(fieldModel.format)}'` 

                else if(moment(fieldValue, this.validDateTimeFormats, false).isValid())
                    return  `'${moment(fieldValue, this.validDateTimeFormats, false).format(fieldModel.format)}'`
                else    
                    return null;

                break;
            case 'time':
                fieldModel.format = fieldModel.format || this.timeFormat;
                if(!fieldValue)
                    return null;

                else if(fieldValue instanceof Date){
                    return `'${moment(fieldValue).format(fieldModel.format)}'`

                }else if(fieldValue instanceof moment)
                    return `'${fieldValue.format(fieldModel.format)}'`

                else if(fieldValue === 'CURRENT_TIMESTAMP')
                    return `'${moment().format(fieldModel.format)}'`

               else if(moment(fieldValue, this.validTimeFormats, false).isValid())
                    return  `'${moment(fieldValue, this.validTimeFormats, false).format(fieldModel.format)}'`
                else    
                    return null;
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
                return `'${(fieldValue)?1:0}'`;
                break;   
            default: //default should be string
                if(fieldValue == null)
                    return null;
                return `'${this.escape(fieldValue)}'`;
                break;
        }
        
    }

    _determineFieldModel(val){     
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

    _nvpToObject(n) {
        if(!n) return {};           
        var a = n.split('\u0002'), o = {}, s = [];
        for (var i = 0; i < a.length; i++) {
            s = a[i].split('=');
            if (s.length == 2)
                o[s[0].toLowerCase()] = s[1];
        }
        return o;
    }

    _objectToNvp(obj){
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

    //returns the copy of schema in lowercase properties
    _getLowerCasedSchema(schema){
        let lcSchema = {};
        Object.keys(schema).map(fieldName => {
            lcSchema[fieldName.toLowerCase()] = {fieldName,fieldSchema:schema[fieldName]};
        })

        return lcSchema;
    }

    _normalizeNVPFields(obj,schema){

        if(!obj.NameValuePairs)
            return obj;

        //step 1) make schema keys lowercase
        let schemaLC = this._getLowerCasedSchema(schema);
        
        //step 2) convert nvp to lower cased object so that we
        let NVP = this._nvpToObject(obj.NameValuePairs)
        let FinalNVP = {},fieldNamesToRemoveFromNVP = [];

        for(let prop in NVP){

            let fieldObj = schemaLC[prop];
            if(fieldObj == null)
                continue;

            if(obj[fieldObj.fieldName] != null){ //if there is already value assigned to actual field then it takes precedence over NVP value
                fieldNamesToRemoveFromNVP.push(prop)
                continue;        
            }

            let fieldSchema = fieldObj.fieldSchema    

            if(typeof fieldSchema === 'string')
                fieldSchema = {type:fieldSchema}
       
            let fieldValue = NVP[prop]; //get NVP value
           
           
            //convert nvp value
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

            if(fieldValue == null)
                continue;

            fieldNamesToRemoveFromNVP.push(prop)

            FinalNVP[fieldObj.fieldName] = fieldValue;
        }

        for(let prop of fieldNamesToRemoveFromNVP){
             delete NVP[prop]
        }

        obj.NameValuePairs = this._objectToNvp(NVP);

        obj = Object.assign(obj,FinalNVP);

        return obj;
    }

    _copy(params){
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

    _checkRequiredStatus(prop,val,fieldModel,requiredFails,mode = 'insert'){

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
        let obj = this._copy(params);
        let fields = [],values = []; 
        let val = '',fieldModel,requiredFails = [], hasNVP = false;

        let processField = (prop) => {

            if(typeof fieldModel === 'string')
                fieldModel = {type:fieldModel}

            val = this._readWithSchema(val,obj,fieldModel)

            this._checkRequiredStatus(prop,val,fieldModel,requiredFails,'insert')

           

            if(val == null){
               delete obj[prop]; //null will be discarded
               return;
            }

            values.push(val)
            fields.push(`"${prop}"`);
        }

        if(schema){
            
            if(schema instanceof Array){
                
                fieldModel = {type:'any'};
                for (let prop of schema){

                    val = obj[prop];
                    processField(prop);
                }

            }else{

                if(this._fixNVP && schema['NameValuePairs']){
                    obj = this._normalizeNVPFields(obj,schema)
                }

                for (let prop in schema){

                    val = obj[prop];
                    fieldModel = schema[prop];
                    processField(prop);
                }
            }


        }else{

            for (let prop in obj){
              
                val = obj[prop];
                fieldModel = this._determineFieldModel(val)
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
        let obj = this._copy(params);
        let updateSqlStr = '';
        let val = '',fieldModel,requiredFails = [];

        let processField = (prop) => {

            if(typeof fieldModel === 'string')
                fieldModel = {type:fieldModel}

            val = this._readWithSchema(val,obj,fieldModel,'update')

            this._checkRequiredStatus(prop,val,fieldModel,requiredFails,'update')

            if(val == null){
               delete obj[prop]; //null will be discarded
               return;
            }

            if(updateSqlStr.length)    
                updateSqlStr += ', '
            updateSqlStr += ` "${prop}" = ${val} `; 
        }

        if(schema){

            if(schema instanceof Array){
                
                fieldModel = {type:'any'};
                for (let prop of schema){

                    val = obj[prop];
                    processField(prop);
                }

            }else{

                if(this._fixNVP && schema['NameValuePairs']){
                    obj = this._normalizeNVPFields(obj,schema)
                }
                
                for (let prop in schema){

                    val = obj[prop];
                    fieldModel = schema[prop];
                    processField(prop);
                }
            }


        }else{

            for (let prop in obj){
              
                val = obj[prop];
                fieldModel = this._determineFieldModel(val)
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
            let type = schema[fieldName]; 
            if(typeof type === 'object'){
                if(type.preventSelection) //means our schema has defined that we don't want this field to apear in select clause
                    continue;
                type = type.type;
            }
            
            switch(type){
                case 'date': fieldName = `convert(varchar, ${prefix}"${fieldName}", 23) as '${fieldName}'`; break;
                case 'datetime': fieldName = `convert(varchar, ${prefix}"${fieldName}", 121) as '${fieldName}'`; break;
                case 'string': fieldName = `ISNULL(${prefix}"${fieldName}",'') as '${fieldName}'`;break;
                default: fieldName = `${prefix}"${fieldName}"`;break;                    
            }
            fields.push(fieldName);

        }
        return fields.join(',')

    }

    _getConditionAndValue(obj){
        let operatorMap = {

            equals:'equals',
            eq:'equals',
            '=':'equals',
           

            greaterhan:'greaterThan',
            gt:'greaterThan',
            '>':'greaterThan',

            lessthan:'lessThan',
            lt:'lessThan',
            '<':'lessThan',

            greaterorequal:'greaterOrEqual',
            ge:'greaterOrEqual',
            '>=':'greaterOrEqual',                
            '=>':'greaterOrEqual',

            lessorequal:'lessOrEqual',
            le:'lessOrEqual',
            '<=':'lessOrEqual',
            '=<':'lessOrEqual',           
            
            startswith:'startsWith',
            beginswith:'startsWith',
            starts:'startsWith',
            sw:'startsWith',
            '%like':'startsWith',

            endswith:'endsWith', 
            ends:'endsWith',                 
            ew:'endsWith',
            'like%':'startsWith',

            contains:'contains',                
            has:'contains',
            '%like%':'contains',

            includesIn:'includes',
            includes:'includes',
            in:'includes',
            
        }

        let condition,value = null;
        for(condition in obj){
            value = obj[condition]
            break;
        }

        if(!condition)
            throw `Invalid filter specified`

        condition = operatorMap[condition.toLowerCase()];
        
        return {condition,value}    
    }

    generateSimpleWhereClause(params,schema){

            if(typeof params === 'string') //it means we are using costum where clause 
                return params.replace('where ','WHERE ').trim(' ');
                
            if(typeof schema === 'string')
                schema = this.getSchema(schema)
        
            let obj = this._copy(params);
            let whereSqlStr = '';
            let val = '',fieldModel;
            
           
    
            let processField = (prop) => {               

                let condition = 'equals';

                if(typeof fieldModel === 'string')
                    fieldModel = {type:fieldModel}

                if(typeof val === 'object' && !Array.isArray(val)){
                    let result = this._getConditionAndValue(val)
                    val = result.value;
                    obj[prop] = val;
                    condition = result.condition;

                }    

                if(Array.isArray(val)){

                    if(condition !== 'includes')
                            throw `Invalid value specified in filter. You can only specify array when using 'includes' condition`

                    let newVal = [];    
                    for(let i=0;i<val.length;i++){
                        let v = this._readWithSchema(val[i],obj,fieldModel,'whereclause')
                        if(v !== null)
                            newVal.push(v);
                    }
                    val = (newVal.length)?newVal:null;

                }else
                    val = this._readWithSchema(val,obj,fieldModel,'whereclause')
    
                if(val == null){
                   delete obj[prop]; //null will be discarded
                   return;
                }
    
                if(whereSqlStr.length)    
                    whereSqlStr += ' AND '

                switch(condition){
                    case 'equals': whereSqlStr += ` "${prop}" = ${val} `; break;
                    case 'greaterThan': whereSqlStr += ` "${prop}" > ${val} `; break;
                    case 'greaterOrEqual': whereSqlStr += ` "${prop}" >= ${val} `; break;
                    case 'lessThan': whereSqlStr += ` "${prop}" < ${val} `; break;
                    case 'lessOrEqual': whereSqlStr += ` "${prop}" <= ${val} `; break;
                    case 'startsWith': whereSqlStr += ` "${prop}" LIKE '${val.slice(1, -1)}%' `; break;
                    case 'endsWith': whereSqlStr += ` "${prop}" LIKE '%${val.slice(1, -1)}' `; break;
                    case 'contains': whereSqlStr += ` "${prop}" LIKE '%${val.slice(1, -1)}%' `; break;
                    case 'includes': whereSqlStr += ` "${prop}" IN (${val.join(',')}) `; break;
                    
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
    
                        val = obj[prop];
                        fieldModel = schema[prop];
                        processField(prop);
                    }
                }
    
    
            }else{
    
                for (let prop in obj){
                  
                    val = obj[prop];
                    fieldModel = this._determineFieldModel(val)
                    processField(prop);
                }
    
            }

            if(whereSqlStr.length)
                whereSqlStr = `WHERE ${whereSqlStr}`
           
            return whereSqlStr;
    }

    async getNextSeq(dbo,seqName){

        let data = await dbo.sql(`select NEXT VALUE FOR ${this.schemaOwner}.${seqName} as "${seqName}"`)

        if(data.length){
            return data[0][seqName];
        }else{
            throw "Invalid Sequence"
        }  
    }
    

    async readOne(dbo, tableName, query,schema)  {

        if(!schema)
            schema = this.getSchema(tableName) 
             
        let where = this.generateSimpleWhereClause(query,schema);

        if(!where.startsWith('WHERE '))
        throw {code:'PROVIDE_FILTER_CRITERIA',message: `Please provide valid filter criteria`}

        let result = await dbo.sql(`SELECT top 1 ${this.makeSQLSelector(schema)} 
                    FROM ${this.schemaOwner}."${tableName}" with (nolock)
                    ${where}
                    `)
        return (result.length)?result[0]:null;
    }

    async read(dbo, tableName, query, limit, schema)  {
        
       
        if(!schema)
            schema = this.getSchema(tableName) 
          
        let where = this.generateSimpleWhereClause(query,schema);
    
        if(!where.startsWith('WHERE '))
           throw {code:'PROVIDE_FILTER_CRITERIA',message: `Please provide valid filter criteria`}

        limit = (typeof limit === 'number')?` top ${limit} `:'';

    
        return dbo.sql(`SELECT ${limit} ${this.makeSQLSelector(schema)} 
                       FROM ${this.schemaOwner}."${tableName}" with (nolock)
                       ${where}
                       `)
    
    }
    
    
    async insert(dbo, tableName, params,schema){
      
        if(!schema)
            schema = this.getSchema(tableName) 
    
        let data;    

       if(Array.isArray(params) && params.length){ //if it is array then it means we are inserting multiple records

            let values = [],fields;
            for(let row of params){
                data = this.generateInsertQueryDataHelper(row, schema)  
                if(!fields)
                    fields = data.fields;
                values.push(`(${data.values})`)    
            }

            return dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}" (${fields}) VALUES ${values.join(',')}`);

       }
       
       data = this.generateInsertQueryDataHelper(params, schema)  

       return dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}" (${data.fields})  VALUES(${data.values})`);
    
    }
    
    async update(dbo, tableName, params, query,schema) {

                
            if(!schema)
                schema = this.getSchema(tableName) 
    
           let where = this.generateSimpleWhereClause(query,schema);
    
           if(!where.startsWith('WHERE '))
               throw {code:'PROVIDE_FILTER_CRITERIA',message: `Please provide valid filter criteria`}
    
           //archiving previous     
           //await dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}_History" select * from ${this.schemaOwner}."${tableName}_History" ${where} `)
    
    
           let updateSqlStr = this.generateUpdateQueryDataHelper(params, schema)
    
    
           return dbo.sql(`UPDATE ${this.schemaOwner}."${tableName}" 
               SET                 
               ${updateSqlStr}
               ${where} 
               `)       
    
    }
        
    async remove (dbo, tableName, query,schema){
        
        if(!schema)
            schema = this.getSchema(tableName) 
    
       let where = this.generateSimpleWhereClause(query,schema);
    
       if(!where.startsWith('WHERE '))
           throw `Cannot delete without filter criteria`
    
       //archiving previous     
       //await dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}_History" select * from ${this.schemaOwner}."${tableName}_History" ${where} `)
    
       return dbo.sql(`DELETE FROM ${this.schemaOwner}."${tableName}" ${where}`)       
    
    }
}
