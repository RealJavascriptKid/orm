

/**
 *  ORM Class for Progress database
 */
class ProgressORM {
        

    /** @returns {Promise<ProgressORM>} */
    constructor(opts) {
        this._schemas = null;
        this._schemaPath = null;
        this._sequenceMap = null;
        this._overrideSchemaStrict = null;
        return this._init(opts);
    }
    
    /** @returns {Promise<ProgressORM>} */
    async _init({ dbName, dbo, //needed for schema gathering
    schemaOwner, schemaPath, dateFormat, dateTimeFormat, timeFormat, overrideSchemaStrict, schemaOptions, includeDBPrefix }) {
        const path = require('path')

        if (!dbo || typeof dbo !== 'object')
            throw `"dbo" must be provided. It is needed to get schema`;
       
        this.schemaOwner = schemaOwner || 'PUB';

        this.dbName = dbName || dbo.database;

        if (!this.dbName)
            throw `"dbName" must be provided`;

        this.dbPrefix = (includeDBPrefix && dbo.database)?`${dbo.database}.`:'';
        this.type = 'progress';
        this.schemaOptions = schemaOptions || {
            plantid: 0
        };
        this.moment = require('moment');
        this.dateFormat = dateFormat || 'YYYY-MM-DD'; //used alongside moment
        this.dateTimeFormat = dateTimeFormat || 'YYYY-MM-DD HH:mm:ss';
        this.timeFormat = timeFormat || 'HHmm';
        this._overrideSchemaStrict = overrideSchemaStrict || false; //if true then after schema is overriden then it will REMOVE fields that are NOT overridden
        this._schemas = {};
        this._schemaPath = schemaPath || `./schemas/progress/${this.dbName.toLowerCase()}/`;
        if (!this._schemaPath.endsWith('/'))
            this._schemaPath += '/';
            
        this._schemaPath = path.resolve(this._schemaPath)

        if (!this._schemaPath.endsWith('/'))
            this._schemaPath += '/';

        this.validDateFormats = ['MM/DD/YYYY', 'MM/DD/YY', 'M/D/YYYY', 'M/D/YY', 'YYYY-MM-DD'];
        this.validTimeFormats = ['HH:mm:ss', 'HH:mm', 'HHmm', 'HHmmss'];
        this.validDateTimeFormats = ['MM/DD/YYYY HH:mm:ss', 'MM/DD/YY HH:mm:ss', 'M/D/YYYY HH:mm:ss', 'M/D/YY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss',
            'MM/DD/YYYY HH:mm', 'MM/DD/YY HH:mm', 'M/D/YYYY HH:mm', 'M/D/YY HH:mm', 'YYYY-MM-DD HH:mm',
            'MM/DD/YYYY HHmm', 'MM/DD/YY HHmm', 'M/D/YYYY HHmm', 'M/D/YY HHmm', 'YYYY-MM-DD HHmm',
            'MM/DD/YYYY HHmmss', 'MM/DD/YY HHmmss', 'M/D/YYYY HHmmss', 'M/D/YY HHmmss', 'YYYY-MM-DD HHmmss'];
        this._sequenceMap = await this._getTableSequenceMap();
        await this._populateSchema(dbo);
        return this;
    }

    async _getTableSequenceMap(){
        try{
           return  this._copy(require(`./schemas/progress/${this.dbName.toLowerCase()}/tableSequenceMap.json`)); //used by getSchema utomatically figure out ID fields        
        }catch(ex){
            return {}
        }
    }
    
    /** @returns {Promise<void>} */
    async _populateSchema(dbo) {
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
                                    ,fd."_Width" as 'width'                 
                                    FROM ${this.dbPrefix}${this.schemaOwner}."_field" fd 
                                    INNER JOIN ${this.dbPrefix}${this.schemaOwner}."_file" f ON fd."_file-recid" = f.ROWID 
                                    WHERE f."_Hidden" = 0 
                                    order by  f."_file-name"
                                    with (nolock)`);
        for (let item of allFields) {
            let table = this._schemas[item.table.toLowerCase()];
            if (!table)
                table = this._schemas[item.table.toLowerCase()] = {};
                
            if (item.ArrayExtent > 0) //we are NOT handling array type fields
                continue;
            let seqName = this._getSequenceNameForID(item.table, item);
            if (seqName) {
                item.preventUpdate = true;
                item.preventInsert = true;
                item.insertSequence = seqName;
            }
            delete item.table;
            switch (item.field) {
                case 'CreateDateTime':
                    item = { ...item, type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true };
                    break;
                case 'ModifyDateTime':
                case 'ChangeDT':
                    item = { ...item, type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP', preventSelection: true };
                    break;
                case 'PlantId':
                    item = { ...item, type: 'integer',defaultValueOnInsert:0 };
                    break;
            }

            if(item.relatedDateField)
                item.relatedDateField = item.relatedDateField.toLowerCase();

            if(item.relatedTimeField)
                item.relatedTimeField = item.relatedTimeField.toLowerCase();

            if(item.relatedDateTimeField)
                item.relatedDateTimeField = item.relatedDateTimeField.toLowerCase();

            table[item.field.toLowerCase()] = item;
        }
        await this._applySchemaOverrides();
    }

    
    async _readDir(dir){
        const fs = require('fs');
        try{
            if(!dir.endsWith('/'))
                dir += '/'
            let files = fs.readdirSync(dir)
            return files;
        }catch(ex){
            return [];
        }        
    }
    
    
    /** @returns {Promise<void>} */
    async _applySchemaOverrides() {

        let files = await this._readDir(this._schemaPath);
        if(!files.length)
            return
        let fileLCMap = {}
        files.map(fileName => {
            let fileN = fileName.toLowerCase();
            let fileType = 'js'
            if(fileN.endsWith('.json')){
                fileN = fileN.slice(0, fileN.length - 5)
                fileType = 'json'
            }                
            else if(fileN.endsWith('.js')){
                fileN = fileN.slice(0, fileN.length - 3)
                fileType = 'js'
            }else
                return;
                

            fileLCMap[fileN] = {fileName,fileType};
        })

        for (let tableName in this._schemas) {
            let table = this._schemas[tableName];
            try {
                let schemaFile = fileLCMap[tableName];
                if(!schemaFile)
                    continue;

                let overrideSchema,override = {};    
                if(schemaFile.fileType == 'js')
                    overrideSchema = require(`${this._schemaPath}${schemaFile.fileName}`)(this.schemaOptions); //only require based on 
                else
                    overrideSchema = require(`${this._schemaPath}${schemaFile.fileName}`); //only require based on 
                

                let fieldsToDel = [];
                for (let f in overrideSchema) {
                    
                    let fieldName = f.toLowerCase();

                    override[fieldName] = overrideSchema[f]

                    if (fieldName == '_nvp')
                        continue;

                    if (!table[fieldName]) {
                        fieldsToDel.push(fieldName);
                        continue;
                    }

                    if (typeof override[fieldName] === 'string')
                        override[fieldName] = { type: override[fieldName] };

                    let item = override[fieldName]

                    if(item.relatedDateField)
                        item.relatedDateField = item.relatedDateField.toLowerCase();
        
                    if(item.relatedTimeField)
                        item.relatedTimeField = item.relatedTimeField.toLowerCase();
        
                    if(item.relatedDateTimeField)
                        item.relatedDateTimeField = item.relatedDateTimeField.toLowerCase();

                    table[fieldName] = { ...table[fieldName], ...item };

                    if(table[fieldName].alias){ //if there is any alias then make it alternatives
                        if(!Array.isArray(table[fieldName].alternatives))
                            table[fieldName].alternatives = [];  

                        table[fieldName].alternatives.push(table[fieldName].alias.toLowerCase())
                    }
                }

                for (let fieldName of fieldsToDel)
                    delete override[fieldName];

                if (this._overrideSchemaStrict) {
                    fieldsToDel = [];
                    for (let fieldName in table) {
                        if (!override[fieldName])
                            fieldsToDel.push(fieldName);
                    }
                    for (let fieldName of fieldsToDel)
                        delete table[fieldName];
                }

                if (override._nvp) {
                    table._nvp = override._nvp; //nvp schema
                }

            }
            catch (ex) { }

            if(typeof table._meta !== 'object') //we must have _meta object in schema
                table._meta = {}

        }
    }
    
    /** @returns {string} */
    _getSequenceNameForID(tableName, item) {
        let tableNameLC = tableName.toLowerCase();
        let seqName = '';
        if (this._sequenceMap[tableNameLC]) {
            seqName = this._sequenceMap[tableNameLC][item.field] || this._sequenceMap[tableNameLC][item.field.toLowerCase()] || '';
        }
        return seqName;
    }
    
    /** @returns {any} */
    getAllSchema() {
        return JSON.parse(JSON.stringify(this._schemas)); //we always should return the copy of schema so that it won't get mutated
    }
    
    /** @returns {any} */
    getSchema(schema) {
        if (!this._schemas[schema.toLowerCase()])
            throw `Unable to find schema for ${schema}`;
        return JSON.parse(JSON.stringify(this._schemas[schema.toLowerCase()])); //we always should return the copy of schema so that it won't get mutated
    }
    
    /** @returns {string} */
    getDateTimeFromDateAndTime(dt, t) {
        if (!dt || !t)
            return null;
        let dat, time, moment = this.moment;
        if (dt instanceof Date || dt instanceof moment)
            dat = moment(dt).format('YYYY-MM-DD');
        else
            dat = dt;
        if (t instanceof Date || t instanceof moment)
            time = moment(t).format('HH:mm:ss');
        else
            time = t;
        if (!time.includes(':')) {
            if (time.length == 4)
                time = time.substr(0, 2) + ':' + time.substr(2, 2) + ':00';
            else if (time.length == 6)
                time = time.substr(0, 2) + ':' + time.substr(2, 2) + ':' + time.substr(4, 2);
        }
        return `${dat} ${time}`;
    }
    
    /** @returns {any} */
    escape(str) {
        let strMagic = function (s) {
            if (s == 'null' || s == 'undefined')
                s = '';
            s = s.replace(/'/g, "''");
            return s;
        };
        if (typeof str === 'object') {
            for (let prop in str) {
                if (typeof str[prop] === 'string')
                    str[prop] = strMagic(str[prop]); //removing quotes
                else if (typeof str[prop] === 'undefined' || str[prop] === null)
                    str[prop] = '';
            }
            return str;
        }
        else if (typeof str === 'string')
            return strMagic(str); //removing quotes
        else if (typeof str === 'undefined' || str === null)
            str = '';
        return str;
    }
    
    /** @returns {string | number} */
    _readWithSchema(fieldValue, obj, fieldModel, mode = 'insert', putQuotes = true) {
        const moment = this.moment;
        //Do advance validation here if needed
        //for instance {value:"2.3",type:"decimal"} then we will return parseFloat(fieldModel.value)
        //example 2 {value}
        if (mode == 'insert' && fieldModel.insertSequence && (fieldValue == null || fieldModel.preventInsert)) {
            return `(Select ${this.schemaOwner}."${fieldModel.insertSequence}".NextVal As '${fieldModel.insertSequence}' From SysProgress.Syscalctable)`;
        }
        if (fieldModel.preventUpdate && mode == 'update')
            return null;
        else if (fieldModel.preventInsert && mode == 'insert')
            return null;
        if (!fieldModel.type) {
            fieldModel.type = 'any';
            // if(fieldModel instanceof Date){
            //     fieldModel = {type:'date',value:moment(fieldModel).format(this.dateFormat)}
            // }else if(fieldModel instanceof moment)
            //     fieldModel = {type:'date',value:fieldModel.format(this.dateFormat)}
            // else
            //     fieldModel.type = 'string';
        }
        if (!fieldModel.alternatives)
            fieldModel.alternatives = [];
        if (typeof fieldValue == 'undefined') {
            for (let alt of fieldModel.alternatives) {
                if (typeof obj[alt.toLowerCase()] !== 'undefined') {
                    fieldValue = obj[alt.toLowerCase()];
                    break;
                }
            }
            if (typeof fieldValue == 'undefined') { //if it is still undefined then return
                if (mode == 'insert' && typeof fieldModel.defaultValueOnInsert !== 'undefined')
                    fieldValue = fieldModel.defaultValueOnInsert;
                else if (mode == 'update' && typeof fieldModel.defaultValueOnUpdate !== 'undefined')
                    fieldValue = fieldModel.defaultValueOnUpdate;
                else
                    return null;
            }
        }
        if (fieldModel.type == 'any') {
            fieldModel = this._determineFieldModel(fieldValue);
        }
        let quote = putQuotes ? `'` : ``;
        switch (fieldModel.type.trim()) {
            case 'date':
                fieldModel.format = fieldModel.format || this.dateFormat;
                if (!fieldValue)
                    return null;
                else if (fieldValue instanceof Date) {
                    return `${quote}${moment(fieldValue).format(fieldModel.format)}${quote}`;
                }
                else if (fieldValue instanceof moment)
                    return `${quote}${fieldValue.format(fieldModel.format)}${quote}`;
                else if (fieldValue === 'SYSTIMESTAMP' || fieldValue === 'CURRENT_TIMESTAMP' || fieldValue === 'SYSDATE')
                    return `${quote}${moment().format(fieldModel.format)}${quote}`;
                else if (moment(fieldValue, this.validDateFormats, false).isValid())
                    return `${quote}${moment(fieldValue, this.validDateFormats, false).format(fieldModel.format)}${quote}`;
                else
                    return null;
                break;
            case 'datetime':
                fieldModel.format = fieldModel.format || this.dateTimeFormat;
                if (!fieldValue)
                    return null;
                else if (fieldValue instanceof Date) {
                    return `${quote}${moment(fieldValue).format(fieldModel.format)}${quote}`;
                }
                else if (fieldValue instanceof moment)
                    return `${quote}${fieldValue.format(fieldModel.format)}${quote}`;
                else if (fieldValue === 'getdate()' || fieldValue === 'CURRENT_TIMESTAMP' || fieldValue === 'SYSTIMESTAMP' || fieldValue === 'SYSDATE')
                    return (fieldModel.dbType !== 'datetime')?moment().format(fieldModel.format):`SYSTIMESTAMP`;  //varchars can be defined as datetime            
                else if (moment(fieldValue, this.validDateTimeFormats, false).isValid())
                    return `${quote}${moment(fieldValue, this.validDateTimeFormats, false).format(fieldModel.format)}${quote}`;
                else
                    return null;
                break;
            case 'time':
                fieldModel.format = fieldModel.format || this.timeFormat;
                if (!fieldValue)
                    return null;
                else if (fieldValue instanceof Date) {
                    return `${quote}${moment(fieldValue).format(fieldModel.format)}${quote}`;
                }
                else if (fieldValue instanceof moment)
                    return `${quote}${fieldValue.format(fieldModel.format)}${quote}`;
                else if (fieldValue === 'SYSTIMESTAMP' || fieldValue === 'CURRENT_TIMESTAMP' || fieldValue === 'SYSDATE' || fieldValue === 'SYSTIME')
                    return `${quote}${moment().format(fieldModel.format)}${quote}`;
                else if (moment(fieldValue, this.validTimeFormats, false).isValid())
                    return `${quote}${moment(fieldValue, this.validTimeFormats, false).format(fieldModel.format)}${quote}`;
                else
                    return null;
                break;
            case 'integer':
                if (fieldValue == null || isNaN(fieldValue))
                    return null;
                else if (typeof fieldValue == 'string' && !fieldValue.trim())
                    return null;
                return parseInt(fieldValue);
                break;
            case 'decimal':
                if (fieldValue == null || isNaN(fieldValue))
                    return null;
                else if (typeof fieldValue == 'string' && !fieldValue.trim())
                    return null;
                return parseFloat(fieldValue);
                break;
            case 'boolean':
                if (fieldValue == null)
                    return null;
                if (typeof fieldValue !== 'boolean') {
                    fieldValue = fieldValue + '';
                    fieldValue = (['y', 'yes', '1', 'true'].includes(fieldValue.toLowerCase())) ? true : false;
                }
                return `${quote}${(fieldValue) ? 1 : 0}${quote}`;
                break;
            default: //default should be string
                if (fieldValue == null || fieldValue == 'null')
                    return null;
                return `${quote}${this.escape(fieldValue)}${quote}`;
                break;
        }
    }
    
    /** @returns {{ type: string; alternatives: any[]; }} */
    _determineFieldModel(val) {
        const moment = this.moment;
        let fieldModel = { type: 'string', alternatives: [] };
        if (val instanceof Date) {
            fieldModel.type = 'date';
        }
        else if (val instanceof moment) {
            fieldModel.type = 'date';
        }
        else if (typeof val == "boolean")
            fieldModel.type = 'boolean';
        else if (typeof val == "number") {
            if (val % parseInt(val) == 0)
                fieldModel.type = 'integer';
            else
                fieldModel.type = 'decimal';
        }
        return fieldModel;
    }
    
    /** @returns {{}} */
    nvpToObject(n) {
        if (!n)
            return {};
        var a = n.split('\u0002'), o = {}, s = [];
        for (var i = 0; i < a.length; i++) {
            s = a[i].split('=');
            if (s.length == 2)
                o[s[0].toLowerCase()] = s[1];
        }
        return o;
    }
    
    /** @returns {string} */
    objectToNvp(obj) {
        let nvp = [];
        for (let prop in obj) {
            let item = obj[prop];
            if (typeof item == 'undefined' || typeof item == 'object' || typeof item == 'function') {
                //nvp.push(prop.toLowerCase() + '=');
                continue;
            }
            nvp.push(prop.toLowerCase() + '=' + item);
        }
        return nvp.join('\u0002');
    }
    
    /** @returns {any} */
    normalizeNVPFields(obj, schema) {
        if (typeof schema === 'string')
            schema = this.getSchema(schema);
        let nvpSchema = schema ? schema._nvp : null;
        if (!nvpSchema) //schema is NOT defined for NVP fields so we cannot manipulate it :(
            return obj;
        let NVP = this.nvpToObject(obj.NameValuePairs);
        let FinalNVP = {};
        for (let prop in nvpSchema) {
            let fieldSchema = nvpSchema[prop];
            if (typeof fieldSchema === 'string')
                fieldSchema = { type: fieldSchema };
            let nvpProp = fieldSchema.nvpname ? fieldSchema.nvpname.toLowerCase() : prop;
            let fieldValue = NVP[nvpProp];
            if (typeof fieldValue === 'undefined' && typeof NVP[nvpProp.toLowerCase()] !== 'undefined') { //it means NVP Field case is different
                fieldValue = NVP[nvpProp.toLowerCase()];
            }
            if (typeof fieldValue == 'undefined')
                continue;
            switch (fieldSchema.type.trim()) {
                // case 'date':
                //     break;
                // case 'datetime': 
                //     break;
                // case 'time':
                //     break;
                case 'integer':
                    fieldValue = parseInt(fieldValue);
                    break;
                case 'decimal':
                    fieldValue = parseFloat(fieldValue);
                    break;
                case 'boolean':
                    fieldValue = (['y', 'yes', '1', 'true'].includes(fieldValue.toLowerCase())) ? true : false;
                    break;
            }
            FinalNVP[prop] = fieldValue;
        }
        obj = Object.assign(obj, FinalNVP);
        // if(!['OrderHeader','OrderDetail','PalletHeader'].includes(schemaName)) //because order header has too man NVP fields that are NOT used in Nimbus
        //     delete obj.NameValuePairs;
        return obj;
    }
    
    /** @returns {{}} */
    _copy(params) {
        let moment = this.moment;
        let obj = {}; //let obj = JSON.parse(JSON.stringify(params))//copying
        for (let i in params) {

            let val = params[i];           
            let key = i.toLowerCase();

            if (typeof val === 'object') {
                if (val instanceof moment)
                    obj[key] = val.clone();
                else if (val instanceof Date)
                    obj[key] = new Date(val.getTime());
                else
                    obj[key] = JSON.parse(JSON.stringify(val));
            }
            else
                obj[key] = val;
                
        }
        return obj;
    }
    
    /** @returns {void} */
    _checkRequiredStatus(prop, val, fieldModel, requiredFails, mode = 'insert') {
        if (mode == 'insert' && fieldModel.requiredOnInsert && !fieldModel.preventInsert) {
            if (val == null || (val === "''" && fieldModel.type === 'string'))
                requiredFails[prop] = true;
        }
        else if (mode == 'update' && fieldModel.requiredOnUpdate && !fieldModel.preventUpdate) {
            if (val == null || (val === "''" && fieldModel.type === 'string'))
                 requiredFails[prop] = true;
        }
    }
    //reason needed it to gracefully handle nulls and other invalid data types from insert quries 
    //use it for complex insert statments For rudementary inserts with less fields I would prefer
    //old school way but it still works

    _getFieldsToReprocessBecauseOfRelatedFields(schema,relatedFields,fieldValuesHash){

        let reprocessFields = {},moment = this.moment;
        for(let {prop,fldModel} of relatedFields){

            if(fldModel.type === 'date' || fldModel.type === 'time'){
                
                if(fldModel.relatedDateTimeField && typeof fieldValuesHash[fldModel.relatedDateTimeField] === 'string'){                        
                    reprocessFields[prop] = moment(fieldValuesHash[fldModel.relatedDateTimeField].replaceAll("'",'')).format(fldModel.format)
                }                     
            }else if(fldModel.type === 'datetime'){
                
                if(fldModel.relatedDateField && typeof fieldValuesHash[fldModel.relatedDateField] === 'string'
                   && fldModel.relatedTimeField && typeof fieldValuesHash[fldModel.relatedTimeField] === 'string' ){

                    let relatedDateFieldModel = schema[fldModel.relatedDateField],
                        relatedTimeFieldModel = schema[fldModel.relatedTimeField];    

                    if(relatedTimeFieldModel && relatedTimeFieldModel){

                        let d = moment(fieldValuesHash[fldModel.relatedDateField].replaceAll("'",''),relatedDateFieldModel.format).format(this.dateFormat),
                            t = moment(fieldValuesHash[fldModel.relatedTimeField].replaceAll("'",''),relatedTimeFieldModel.format).format(this.timeFormat);
                     
                        reprocessFields[prop] = moment(`${d} ${t}`).format(fldModel.format)
                    }
                    
                }                     
            }                   
        }

        return reprocessFields;

    }
    
    /** @returns {{ fields: any[]; values: any[]; }} */
    generateInsertQueryDataHelper(params, schema) {
        let obj = this._copy(params);
        let fields = [], values = [];
        let val = '', fieldModel, requiredFails = {},relatedFields = [],fieldValuesHash = {};
        let processField = (prop,isReprocessing = false) => {
            if (prop == 'namevaluepairs')
                return;
            if (typeof fieldModel === 'string')
                fieldModel = { type: fieldModel };
            val = this._readWithSchema(val, obj, fieldModel, 'insert');
            this._checkRequiredStatus(prop, val, fieldModel, requiredFails, 'insert');
            if (val == null) {
                 if(isReprocessing == false && (fieldModel.relatedDateField || fieldModel.relatedTimeField || fieldModel.relatedDateTimeField)){ //if there is any relatedFields then add it to array to process later
                    relatedFields.push({prop,fldModel:fieldModel});
                }
                delete obj[prop]; //null will be discarded
                return;
            }
            values.push(val);
            fields.push(`"${prop}"`);
        };
        let processNVPField = (nvpFields) => {
            let NVPObject = {};
            if (obj.namevaluepairs)
                NVPObject = this.nvpToObject(obj.namevaluepairs);
            for (let prop in nvpFields) {
                fieldModel = nvpFields[prop];
                prop = prop.toLowerCase();
                val = obj[prop];
                if (typeof fieldModel === 'string')
                    fieldModel = { type: fieldModel };
                val = this._readWithSchema(val, nvpFields, fieldModel, 'insert', false);
                this._checkRequiredStatus(prop, val, fieldModel, requiredFails, 'insert');
                if (val == null) {
                    delete nvpFields[prop]; //null will be discarded
                    continue;
                }
                if (fieldModel.nvpname)
                    prop = fieldModel.nvpname;
                delete NVPObject[prop.toLowerCase()];
                NVPObject[prop] = val;
            }
            val = this.objectToNvp(NVPObject);
            values.push(val);
            fields.push(`"namevaluepairs"`);
        };
        if (schema) {
            if (schema instanceof Array) {
                fieldModel = { type: 'any' };
                for (let prop of schema) {

                    if(prop == '_meta')
                        continue;

                    val = obj[prop];
                    processField(prop);
                }
            }
            else {
                for (let prop in schema) {

                    if(prop == '_meta')
                        continue;

                    val = obj[prop];
                    fieldModel = schema[prop];
                    processField(prop);
                }
            }
        }
        else {
            for (let prop in obj) {
                if (prop === '_meta') {                    
                    continue;
                }

                if (prop === '_nvp') {
                    processNVPField(schema[prop]);
                    continue;
                }
                val = obj[prop];
                fieldModel = this._determineFieldModel(val);
                processField(prop);
            }
        }

        if(relatedFields.length && schema){  //if there are potential related fields

            let fieldsToReprocess = this._getFieldsToReprocessBecauseOfRelatedFields(schema,relatedFields,fieldValuesHash)
 
            for (let prop in fieldsToReprocess) {
 
                 if(prop == '_meta')
                     continue;
                 delete requiredFails[prop];
                 val = fieldsToReprocess[prop];
                 fieldModel = schema[prop];
                 processField(prop,true);
             }
         }
         requiredFails = Object.keys(requiredFails);


        if (requiredFails.length) {
            throw {
                code: 'MISSING_REQUIRED_PARAM',
                message: `Missing required params: ${requiredFails.join(',')}`,
                data: requiredFails
            };
        }
        fields = fields.join(',');
        values = values.join(',');
        return { fields, values };
    }
    
    /** @returns {string} */
    generateUpdateQueryDataHelper(params, schema) {
        let obj = this._copy(params);
        let updateSqlStr = '';
        let val = '', fieldModel, requiredFails = [],relatedFields = [],fieldValuesHash = {};
        let processField = (prop,isReprocessing = false) => {
            if (prop == 'namevaluepairs')
                return;
            if (typeof fieldModel === 'string')
                fieldModel = { type: fieldModel };
            val = this._readWithSchema(val, obj, fieldModel, 'update');
            this._checkRequiredStatus(prop, val, fieldModel, requiredFails, 'update');
            if (val == null) {

                if(isReprocessing == false && (fieldModel.relatedDateField || fieldModel.relatedTimeField || fieldModel.relatedDateTimeField)){ //if there is any relatedFields then add it to array to process later
                    relatedFields.push({prop,fldModel:fieldModel});
                }

                delete obj[prop]; //null will be discarded
                return;
            }
            if (updateSqlStr.length)
                updateSqlStr += ', ';

            fieldValuesHash[prop] = val;   

            updateSqlStr += ` "${prop}" = ${val} `;
        };
        let processNVPField = (nvpFields) => {
            let NVPObject = {};
            if (obj.namevaluepairs)
                NVPObject = this.nvpToObject(obj.namevaluepairs);
            for (let prop in nvpFields) {
                fieldModel = nvpFields[prop];
                prop = prop.toLowerCase();
                val = obj[prop];
                if (typeof fieldModel === 'string')
                    fieldModel = { type: fieldModel };
                val = this._readWithSchema(val, nvpFields, fieldModel, 'update', false);
                this._checkRequiredStatus(prop, val, fieldModel, requiredFails, 'update');
                if (val == null) {
                    delete nvpFields[prop]; //null will be discarded
                    continue;
                }
                if (fieldModel.nvpname)
                    prop = fieldModel.nvpname;
                delete NVPObject[prop.toLowerCase()];
                NVPObject[prop] = val;
            }
            val = this.objectToNvp(NVPObject);
            if (!val.length)
                return;
            if (updateSqlStr.length)
                updateSqlStr += ', ';
            updateSqlStr += ` "namevaluepairs" = '${val}' `;
        };
        if (schema) {
            if (schema instanceof Array) {
                fieldModel = { type: 'any' };
                for (let prop of schema) {
                    
                    if(prop == '_meta')
                        continue;

                    val = obj[prop];
                    processField(prop);
                }
            }
            else {
                for (let prop in schema) {
                    
                    if(prop === '_meta')
                         continue;

                    if (prop === '_nvp') {
                        processNVPField(schema[prop]);
                        continue;
                    }
                    val = obj[prop];
                    fieldModel = schema[prop];
                    processField(prop);
                }
            }
        }
        else {
            for (let prop in obj) {

                if(prop == '_meta')
                    continue;

                val = obj[prop];
                fieldModel = this._determineFieldModel(val);
                processField(prop);
            }
        }

        if(relatedFields.length && schema){  //if there are potential related fields

            let fieldsToReprocess = this._getFieldsToReprocessBecauseOfRelatedFields(schema,relatedFields,fieldValuesHash)
 
            for (let prop in fieldsToReprocess) {
 
                 if(prop == '_meta')
                     continue;
 
                 delete requiredFails[prop];
                 val = fieldsToReprocess[prop];
                 fieldModel = schema[prop];
                 processField(prop,true);
             }
         }
 
         requiredFails = Object.keys(requiredFails);

        if (requiredFails.length) {
            throw {
                code: 'MISSING_REQUIRED_PARAM',
                message: `Missing required params: ${requiredFails.join(',')}`,
                data: requiredFails
            };
        }
        
        return updateSqlStr;
    }
    
    /** @returns {string} */
    makeSQLSelector(schema, prefix,selectedFields) {
        if (typeof schema === 'string')
            schema = this.getSchema(schema);
        prefix = (prefix) ? prefix + '.' : '';
        if (Array.isArray(schema)) {
            return schema.map(fieldName => `${prefix}"${fieldName}"`).join(',');
        }
        let fields = [],ignorePreventSelect = false;
        
        if(selectedFields === '*'){

            selectedFields = null;
            ignorePreventSelect = true
            selectedFields = Object.keys(schema)

        }else if(Array.isArray(selectedFields)){

            ignorePreventSelect = true

        }else{
            selectedFields = Object.keys(schema)
        }   

        for (let f of selectedFields) {
            
            let fieldName = f.toLowerCase();

            if(fieldName == '_meta')
                continue;

            if (fieldName == '_nvp') { //handling NameValuePairs field
                if (!schema['namevaluepairs']) {
                    fields.push(`${prefix}"NameValuePairs"`);
                }
                continue;
            }
            let type = schema[fieldName],
                fieldAlias = f;

            if(type == null)  //it means field is not in schema
                continue;

            if (typeof type === 'object') {
                if (ignorePreventSelect == false && type.preventSelection) //means our schema has defined that we don't want this field to apear in select clause
                    continue;

                if(type.field)
                    fieldAlias = type.field; 

                if(type.alias != null)
                    fieldAlias = type.alias;     

                type = type.type;
            }
            switch (type) {
                // case 'date': fieldName = `convert(varchar, ${prefix}"${fieldName}", 23) as '${fieldName}'`; break;
                // case 'datetime': fieldName = `convert(varchar, ${prefix}"${fieldName}", 121) as '${fieldName}'`; break;
                case 'string':
                    fieldName = `IFNULL(${prefix}"${fieldName}",'') as '${fieldAlias}'`;
                    break;
                default:
                    fieldName = `${prefix}"${fieldName}" as '${fieldAlias}'`;
                    break;
            }
            fields.push(fieldName);
        }
        return fields.join(',');
    }
    
    /** @returns {{ condition: any; value: any; }} */
    _getConditionAndValue(obj) {
        let operatorMap = {
            equals: 'equals',
            eq: 'equals',
            '=': 'equals',
            greaterthan: 'greaterThan',
            gt: 'greaterThan',
            '>': 'greaterThan',
            lessthan: 'lessThan',
            lt: 'lessThan',
            '<': 'lessThan',
            greaterorequal: 'greaterOrEqual',
            ge: 'greaterOrEqual',
            '>=': 'greaterOrEqual',
            '=>': 'greaterOrEqual',
            lessorequal: 'lessOrEqual',
            le: 'lessOrEqual',
            '<=': 'lessOrEqual',
            '=<': 'lessOrEqual',
            startswith: 'startsWith',
            beginswith: 'startsWith',
            starts: 'startsWith',
            sw: 'startsWith',
            '%like': 'startsWith',
            endswith: 'endsWith',
            ends: 'endsWith',
            ew: 'endsWith',
            'like%': 'startsWith',
            contains: 'contains',
            has: 'contains',
            '%like%': 'contains',
            includesin: 'includes',
            includes: 'includes',
            in: 'includes',
        };

        let condition, value = null;
        
        if(Array.isArray(obj)){
            return {
                 value: obj,
                 condition: 'includes'
            }
         }

        for (condition in obj) {
            value = obj[condition];
            break;
        }
        if (!condition)
            throw `Invalid filter specified`;
        condition = operatorMap[condition.toLowerCase()];
        return { condition, value };
    }
    
    /** @returns {string} */
    generateSimpleWhereClause(params, inputSchema) {
        if (typeof params === 'string') //it means we are using costum where clause 
            return params.replace('where ', 'WHERE ').trim(' ');
        if (typeof inputSchema === 'string')
            inputSchema = this.getSchema(inputSchema);
        let schema = this._copy(inputSchema);
        let obj = this._copy(params);
        let whereSqlStr = '';
        let val = '', fieldModel;
        let processField = (prop) => {
            if (prop == 'namevaluepairs')
                return;
            let condition = 'equals';
            if (typeof fieldModel === 'string')
                fieldModel = { type: fieldModel };
            if (typeof val === 'object') {
                let result = this._getConditionAndValue(val);
                val = result.value;
                obj[prop] = val;
                condition = result.condition;
            }
            if (Array.isArray(val)) {
                if (condition !== 'includes')
                    throw `Invalid value specified in filter. You can only specify array when using 'includes' condition`;
                let newVal = [];
                for (let i = 0; i < val.length; i++) {
                    let v = this._readWithSchema(val[i], obj, fieldModel, 'whereclause');
                    if (v !== null)
                        newVal.push(v);
                }
                val = (newVal.length) ? newVal : null;
            }
            else
                val = this._readWithSchema(val, obj, fieldModel, 'whereclause');
            if (val == null) {
                delete obj[prop]; //null will be discarded
                return;
            }
            if (whereSqlStr.length)
                whereSqlStr += ' AND ';
            switch (condition) {
                case 'equals':
                    whereSqlStr += ` "${prop}" = ${val} `;
                    break;
                case 'greaterThan':
                    whereSqlStr += ` "${prop}" > ${val} `;
                    break;
                case 'greaterOrEqual':
                    whereSqlStr += ` "${prop}" >= ${val} `;
                    break;
                case 'lessThan':
                    whereSqlStr += ` "${prop}" < ${val} `;
                    break;
                case 'lessOrEqual':
                    whereSqlStr += ` "${prop}" <= ${val} `;
                    break;
                case 'startsWith':
                    whereSqlStr += ` "${prop}" LIKE '${val.slice(1, -1)}%' `;
                    break;
                case 'endsWith':
                    whereSqlStr += ` "${prop}" LIKE '%${val.slice(1, -1)}' `;
                    break;
                case 'contains':
                    whereSqlStr += ` "${prop}" LIKE '%${val.slice(1, -1)}%' `;
                    break;
                case 'includes':
                    whereSqlStr += ` "${prop}" IN (${val.join(',')}) `;
                    break;
            }
        };
        let processNVPField = (nvpFields) => {
            let NVPObject = {};
            if (obj.namevaluepairs)
                NVPObject = this.nvpToObject(obj.namevaluepairs);
            for (let prop in nvpFields) {
                fieldModel = nvpFields[prop];
                prop = prop.toLowerCase();
                val = obj[prop];
                if (typeof fieldModel === 'string')
                    fieldModel = { type: fieldModel };
                val = this._readWithSchema(val, nvpFields, fieldModel, 'whereclause', false);
                if (val == null) {
                    delete nvpFields[prop]; //null will be discarded
                    continue;
                }
                if (fieldModel.nvpname)
                    prop = fieldModel.nvpname;
                delete NVPObject[prop.toLowerCase()];
                NVPObject[prop] = val;
            }
            let str = '';
            for (let key in NVPObject) {
                if (str.length)
                    str += ' AND ';
                str += `"NameValuePairs" LIKE '%${key}=${NVPObject[key]}%'`;
            }
            if (str.length) {
                if (whereSqlStr.length)
                    whereSqlStr += ' AND ';
                whereSqlStr += ` (${str}) `;
            }
        };
        if (schema) {
            if (schema instanceof Array) {
                fieldModel = { type: 'any' };
                for (let prop of schema) {
                    if(prop == '_meta')
                        continue;
                    val = obj[prop];
                    processField(prop);
                }
            }
            else {
                for (let prop in schema) {

                    if(prop == '_meta')
                        continue;

                    if (prop === '_nvp') {
                        processNVPField(schema[prop]);
                        continue;
                    }
                    val = obj[prop];
                    fieldModel = schema[prop];
                    processField(prop);
                }
            }
        }
        else {
            for (let prop in obj) {
                
                if(prop == '_meta')
                    continue;

                val = obj[prop];
                fieldModel = this._determineFieldModel(val);
                processField(prop);
            }
        }
        if (whereSqlStr.length)
            whereSqlStr = `WHERE ${whereSqlStr}`;
        return whereSqlStr;
    }
    
    /** @returns {Promise<any>} */
    async getNextSeq(dbo, seqName) {
        let data = await dbo.sql(`select ${this.schemaOwner}."${seqName}".nextVal as "${seqName}" from Sysprogress.Syscalctable`);
        if (data.length) {
            return data[0][seqName];
        }
        else {
            throw "Invalid Sequence";
        }
    }
    
    /** @returns {Promise<any>} */
    async readOne(dbo, tableName, query, options = {}) {
        
        let {schema} = options;

        if (!schema)
            schema = this.getSchema(tableName);
        let where = this.generateSimpleWhereClause(query, schema);
        if (!where.startsWith('WHERE '))
            throw { code: 'PROVIDE_FILTER_CRITERIA', message: `Please provide valid filter criteria` };

        let result = await this.read(dbo, tableName, query,{
            ...options,
            limit:1
        })
        return (result.length) ? result[0] : null;
    }
    
    /** @returns {Promise<any>} */
    async read(dbo, tableName, query, options = {}) {
        
        let {schema} = options;

        if (!schema)
            schema = await this.getSchema(tableName);
        let where = this.generateSimpleWhereClause(query, schema);
        if (!where.startsWith('WHERE '))
            throw { code: 'PROVIDE_FILTER_CRITERIA', message: `Please provide valid filter criteria` };
        

        options.limit = options.limit || options.take || null;
        options.offset = options.offset || options.skip || null;
        options.sort = options.sort || null;
        let top = (typeof options.limit === 'number' && !options.offset) ? ` top ${options.limit} ` : '',
            orderBy = '', 
            offset = options.offset ? `OFFSET ${options.offset} ROWS ` : '', 
            limit = (options.limit && options.offset) ? `FETCH NEXT ${options.limit} ROWS Only ` : '';
            
        if (options.sort) {
            let sort = options.sort;
            let orderBys = [];
            if (typeof sort === 'string' || (typeof sort === 'object' && !Array.isArray(sort)))
                sort = [sort];
            if (!Array.isArray(sort))
                throw { code: 'INVALID_SORTING_CRITERIA', message: `Please provide correct sorting criteria` };
            for (let item of sort) {
                if (typeof item === 'string')
                    orderBys.push(item);
                else if (typeof item === 'object') {
                    if (!item.field || !item.dir)
                        throw { code: 'INVALID_SORTING_CRITERIA', message: `Please provide correct sorting field object` };
                    item.dir = (item.dir == '-1' || item.dir == 'desc') ? 'desc' : 'asc'; //by default it is asending
                    orderBys.push(`${item.field} ${item.dir}`);
                }
            }
            if (orderBys.length)
                orderBy = ' ORDER BY ' + orderBys.join(',');
        }

        let results = await dbo.sql(`SELECT ${top}  ${this.makeSQLSelector(schema,null,options.fields)} 
                    FROM ${this.dbPrefix}${this.schemaOwner}."${tableName}" 
                    ${where}
                    ${orderBy}
                    ${offset}
                    ${limit}
                    with (nolock)
                    `);
        if (results.length && (results[0].NameValuePairs || typeof options.flatBy === 'string')) { 
            
                     
            results = results.map(result => {

                if(result.NameValuePairs)
                    result = this.normalizeNVPFields(result, schema); //unfortunately we have to do this for Progress ONLY so that we can get these namevaluepairs fields addressed
                
                if(options.flatBy && result[options.flatBy])
                    return result[options.flatBy]
                
                return result;
            });
        }
        return results;
    }
    
    /** @returns {Promise<any>} */
    async insert(dbo, tableName, params, options = {}) {
        
        let {schema,returnResult} = options;

        if (!schema)
            schema = await this.getSchema(tableName);
        let arr = (Array.isArray(params)) ? params : [params];
        //I can use Promise.all() but for now I'm keeping it one at time since this is PROGRESS ORM  so 
        //we don't necessarily want to consume all db agents
        
        for (let row of arr) {
            let data = this.generateInsertQueryDataHelper(row, schema);
            await dbo.sql(`INSERT INTO ${this.dbPrefix}${this.schemaOwner}."${tableName}" (${data.fields})  VALUES(${data.values})`);            
        }

        if(returnResult){
            let results = [];
            for(let row of arr){
                let result = await this.readOne(dbo,tableName,row)
                results.push(result)
            }
            if(results.length === 1)
                return results[0];
            return results;
        }
        
    }
    
    /** @returns {Promise<any>} */
    async update(dbo, tableName, params, query, options = {}) {
        
        let {schema,returnResult} = options;

        if (!schema)
            schema = await this.getSchema(tableName);
        let where = this.generateSimpleWhereClause(query, schema);
        if (!where.startsWith('WHERE '))
            throw { code: 'PROVIDE_FILTER_CRITERIA', message: `Please provide valid filter criteria` };
        //archiving previous     
        //await dbo.sql(`INSERT INTO dbo."${tableName}_History" select * from dbo."${tableName}_History" ${where} `)
        let updateSqlStr = this.generateUpdateQueryDataHelper(params, schema);
        await dbo.sql(`UPDATE ${this.dbPrefix}${this.schemaOwner}."${tableName}" 
               SET                 
               ${updateSqlStr}
               ${where} 
               `);

        if(returnResult)
             return this.read(dbo,tableName,where,options)

    }
    
    /** @returns {Promise<any>} */
    async remove(dbo, tableName, query, options = {}) {

        let {schema} = options;

        if (!schema)
            schema = await this.getSchema(tableName);
        let where = this.generateSimpleWhereClause(query, schema);
        if (!where.startsWith('WHERE '))
            throw `Cannot delete without filter criteria`;
        return dbo.sql(`DELETE FROM ${this.dbPrefix}${this.schemaOwner}."${tableName}" ${where}`);
    }

     /**
     * 
     * @param {string} table  table name 
     * @param {Object} schemaOverrides  the schema object that we want to overrdie
     * @param {boolean} [permenant] permenant flag will permenantly change the schema from default
     * @returns {Object} 
     */
     overrideSchema(table,schemaOverrides,permenant = false){

        let srcSchema = this.getSchema(table);

        if(permenant){
            srcSchema = this._schemas[table.toLowerCase()] 
        }

        for(let i in schemaOverrides){

            let fieldSchema = srcSchema[i.toLowerCase()]
            if(fieldSchema == null)
                continue;

            fieldSchema = {
                ...fieldSchema,
                ...schemaOverrides[i]
            }
            srcSchema[i.toLowerCase()] = fieldSchema;
        }

        

        return srcSchema;
    }
}


module.exports = ProgressORM

