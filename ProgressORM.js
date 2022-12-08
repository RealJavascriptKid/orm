

 module.exports = class ProgressORM{

    constructor(databaseName,options){
        this.dbName = databaseName;
        this.type = 'progress';
        this.options = options || {};
        this.moment = require('moment')            
        this.dateFormat = 'YYYY-MM-DD'; //used alongside moment
        this.dateTimeFormat = 'YYYY-MM-DD HH:mm:ss';
        this.timeFormat = 'HHmm';
    }
    
    getSchema(schema,opts){
        if(!opts)
            opts = this.options;
        let result = require(`./schemas/progress/${this.dbName.toLowerCase()}/${schema}`)(opts) //only require based on 
        return result  
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

    _readWithSchema(fieldValue,obj,fieldModel,mode = 'insert',putQuotes = true){
        const moment = this.moment;
        //Do advance validation here if needed
        //for instance {value:"2.3",type:"decimal"} then we will return parseFloat(fieldModel.value)
        //example 2 {value}

        if(mode == 'insert' && fieldModel.insertSequence && (fieldValue == null || fieldModel.preventInsert)){
            return `(Select pub."${fieldModel.insertSequence}".NextVal As '${fieldModel.insertSequence}' From SysProgress.Syscalctable)`;
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

    copy(params){
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
        let obj = this.copy(params);
        let fields = [],values = []; 
        let val = '',fieldModel,requiredFails = [];

        let processField = (prop) => {
            if(prop == 'NameValuePairs')
                return;

            if(typeof fieldModel === 'string')
                fieldModel = {type:fieldModel}

            val = this._readWithSchema(val,obj,fieldModel,'insert')

            this._checkRequiredStatus(prop,val,fieldModel,requiredFails,'insert')

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

                val = this._readWithSchema(val,nvpFields,fieldModel,'insert',false)

                this._checkRequiredStatus(prop,val,fieldModel,requiredFails,'insert')

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
        let obj = this.copy(params);
        let updateSqlStr = '';
        let val = '',fieldModel,requiredFails = [];

        let processField = (prop) => {
            if(prop == 'NameValuePairs')
                return;

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

        let processNVPField = (nvpFields) => {

            let NVPObject = {};

            if(obj.NameValuePairs)
                NVPObject = this.nvpToObject(obj.NameValuePairs)

            for(let prop in nvpFields){
                
                fieldModel = nvpFields[prop]
                
                val = obj[prop];

                if(typeof fieldModel === 'string')
                    fieldModel = {type:fieldModel}

                val = this._readWithSchema(val,nvpFields,fieldModel,'update',false)

                this._checkRequiredStatus(prop,val,fieldModel,requiredFails,'update')

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

            let schema = this.copy(inputSchema);


            let obj = this.copy(params);

            let whereSqlStr = '';
            let val = '',fieldModel;

            let processField = (prop) => {
                if(prop == 'NameValuePairs')
                    return;
                  
                if(typeof fieldModel === 'string')
                    fieldModel = {type:fieldModel}    

                val = this._readWithSchema(val,obj,fieldModel,'whereclause')

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
    
                    val = this._readWithSchema(val,nvpFields,fieldModel,'update',false)    
                       
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
                    fieldModel = this._determineFieldModel(val)
                    processField(prop);
                }

            }

            if(whereSqlStr.length)
                whereSqlStr = `WHERE ${whereSqlStr}`
        
            return whereSqlStr;
    }

}    


