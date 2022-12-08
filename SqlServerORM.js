
module.exports = class SqlServerORM {


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
        this.#overrideSchemaStrict = overrideSchemaStrict || false; //if true then after schema is overriden then it will remove additional fields
        this.#schemas = {}
        this.#schemaPath =  schemaPath || `./schemas/sqlserver/${this.dbName.toLowerCase()}/`
        if(!this.#schemaPath.endsWith('/'))
            this.#schemaPath += '/';
            
        //this.#sequenceMap = require(`./schemas/sqlserver/${this.dbName.toLowerCase()}/tableSequenceMap.json`); //used by getTableSchema to automatically figure out ID fields

        await this.#populateSchema(dbo);
    }


    async #populateSchema(dbo){
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
                                    ,TABLE_NAME as 'table'
                                    ,COLUMNPROPERTY(object_id(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') as 'IsID'
                                    FROM INFORMATION_SCHEMA.COLUMNS c 
                                    order by TABLE_NAME`)
        for(let item of allFields){
            let table = this.#schemas[item.table];

            if(!table)
                table = this.#schemas[item.table] = {};

            if(['TimeFrame','RecordSeq'].includes(item.field))
                continue;

           if(item.IsID){
               item.preventUpdate = true;
               item.preventInsert = true;
           }

           switch(item.field){
               case 'CreateDateTime': 
                   item = { field: 'CreateDateTime', type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true }
                   break;

               case 'ModifyDateTime': case 'ChangeDT': 
                   item = { field: 'ModifyDateTime',type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true }
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

                let override = require(`${this.#schemaPath}${table}`)(this.schemaOptions) //only require based on 
                let fieldsToDel = [];
                for(let fieldName in override){
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
               

              }catch(ex){}

        }

    }
       

    async getSchema(schema){
        if(!this.schemas[schema])
            throw `Unable to find schema for ${schema}`

        return JSON.parse(JSON.stringify(this.schemas[schema])) //we always should return the copy of schema so that it won't get mutated
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

    #readWithSchema(fieldValue,obj,fieldModel,mode = 'insert'){
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
            fieldModel = this.#determineFieldModel(fieldValue);
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

                else    
                    return `'${fieldValue}'`;
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

                else{                    
                    //return `'${fieldValue}'`;
                    return `'${moment(fieldValue).format(fieldModel.format)}'`
                }
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

                else
                    return `'${fieldValue}'`;
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

            if(typeof fieldModel === 'string')
                fieldModel = {type:fieldModel}

            val = this.#readWithSchema(val,obj,fieldModel)

            this.#checkRequiredStatus(prop,val,fieldModel,requiredFails,'insert')

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
                for (let prop in schema){

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
        
        fields = fields.join(',')
        values = values.join(',')
        return {fields,values}
    }    

    generateUpdateQueryDataHelper(params,schema){ 
        let obj = this.#copy(params);
        let updateSqlStr = '';
        let val = '',fieldModel,requiredFails = [];

        let processField = (prop) => {

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

    generateSimpleWhereClause(params,schema){

            if(typeof schema === 'string')
                schema = this.getSchema(schema)
        
            let obj = this.#copy(params);
            let whereSqlStr = '';
            let val = '',fieldModel;
    
            let processField = (prop) => {

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
                    fieldModel = this.#determineFieldModel(val)
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

    async read(dbo, tableName, query,schema)  {
        
       
        if(!schema)
            schema = this.getSchema(tableName) 
          
        let where = this.generateSimpleWhereClause(query,schema);
    
        if(!where.startsWith('WHERE '))
           throw {code:'PROVIDE_FILTER_CRITERIA',message: `Please provide valid filter criteria`}
    
        return dbo.sql(`SELECT ${this.makeSQLSelector(schema)} 
                       FROM ${this.schemaOwner}."${tableName}" with (nolock)
                       ${where}
                       `)
    
    }
    
    
    async insert(dbo, tableName, params,schema){
      
        if(!schema)
            schema = this.getSchema(tableName) 
    
       let data = this.generateInsertQueryDataHelper(params, schema)
    
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
