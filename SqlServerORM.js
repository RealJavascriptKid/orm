

/// <reference path="typedefs.d.ts" />
/// <reference path="../DB/typedefs.d.ts" />

/** 
 * ORM Class for SqlServer database
 * 
*/
class SqlServerORM {
        

    /** @returns {Promise<SqlServerORM>} */
    constructor(opts) {
        this._schemas = null;
        this._schemaPath = null;
        this._sequenceMap = null;
        this._overrideSchemaStrict = null;
        this._fixNVP = null;
        return this._init(opts);
    }
    
    /** @returns {Promise<SqlServerORM>} */
    async _init({ dbName, dbo, //needed for schema gathering    
    schemaOwner, schemaPath, dateFormat, dateTimeFormat, timeFormat, overrideSchemaStrict, schemaOptions, fixNVPs, //CFS NVP fields
    isProgressDataServer,includeDBPrefix
     }) {
        const path = require('path')

        if (!dbo || typeof dbo !== 'object')
            throw `"dbo" must be provided. It is needed to get schema`;
       
        this._fixNVP = fixNVPs || false; //if true then when inserting or updating if there is NameValuePairs field and there is corresponding field in schema it will remove it from NVP and put it in real field           
        this.schemaOwner = schemaOwner || 'dbo';
        this.dbName = dbName || dbo.database;

        if (!this.dbName)
            throw `"dbName" must be provided`;

        this.dbPrefix = ((includeDBPrefix == true || includeDBPrefix == null) && dbo.database)?`${dbo.database}.`:'';
        this.type = 'sqlserver';
        this.isProgressDataServer = isProgressDataServer || false;
        this.schemaOptions = schemaOptions || {
            plantid: 0
        };
        this.moment = require('moment');
        this.dateFormat = dateFormat || 'YYYY-MM-DD'; //used alongside moment
        this.dateTimeFormat = dateTimeFormat || 'YYYY-MM-DD HH:mm:ss';
        this.timeFormat = timeFormat || 'HH:mm:ss';
        this._overrideSchemaStrict = overrideSchemaStrict || false; //if true then after schema is overriden then it will REMOVE fields that are NOT overridden
        this._schemas = {};
        this._schemaPath = schemaPath || `./schemas/sqlserver/${this.dbName.toLowerCase()}/`;
        if (!this._schemaPath.endsWith('/'))
            this._schemaPath += '/';

        this._schemaPath = path.resolve(this._schemaPath)

        if (!this._schemaPath.endsWith('/'))
            this._schemaPath += '/';

        this._schemaPath = path.normalize(this._schemaPath);
        

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
           return  this._copy(require(`./schemas/sqlserver/${this.dbName.toLowerCase()}/tableSequenceMap.json`)); //used by getSchema utomatically figure out ID fields        
        }catch(ex){
            return {}
        }
    }
    
    /** @returns {Promise<void>} */
    async _populateSchema(dbo) {
      

        let allFields = await dbo.sql(`select c.COLUMN_NAME as 'field',c.DATA_TYPE as 'dbType', (
                                    case  c.DATA_TYPE 
                                    when 'bit' then 'boolean'
                                    when 'varchar' then 'string'
                                    when 'char' then 'string'
                                    when 'nvarchar' then 'string'
                                    when 'ntext' then 'string'
                                    when 'nchar' then 'string'
                                    when 'text' then 'string'
                                    when 'date' then 'date'
                                    when 'smalldatetime' then 'datetime'
                                    when 'datetime' then 'datetime'
                                    when 'datetime2' then 'datetime'
                                    when 'datetimeoffset' then 'datetime'
                                    when 'time' then 'time'
                                    when 'int' then 'integer'
                                    when 'tinyint' then 'integer'
                                    when 'smallint' then 'integer'
                                    when 'bigint' then 'integer'
                                    when 'numeric' then 'decimal'
                                    when 'decimal' then 'decimal'
                                    when 'integer' then 'integer'
                                    when 'float' then 'decimal'
                                    when 'real' then 'decimal'
                                    else 'any' 
                                    end) as 'type' 
                                    ,c.CHARACTER_MAXIMUM_LENGTH as 'width'
                                    ,TABLE_NAME as 'table'
                                    ,COLUMNPROPERTY(object_id(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') as 'IsID'
                                    FROM ${this.dbPrefix}INFORMATION_SCHEMA.COLUMNS c 
                                    order by TABLE_NAME`);
        for (let item of allFields) {

            let table = this._schemas[item.table.toLowerCase()];
            if (!table)
                table = this._schemas[item.table.toLowerCase()] = {};

            if(typeof table._meta !== 'object') 
                table._meta  = {}

            if (['TimeFrame', 'RecordSeq','PROGRESS_RECID','PROGRESS_RECID_IDENT_'].includes(item.field))
                continue;

            if(this.isProgressDataServer && !table._meta.progressDataServerIDSequence){

                let seqName = this._getSequenceNameForID(item.table, item);
                if (seqName) {
                    item.IsID = true;
                    table._meta.progressDataServerIDSequence = seqName                     
                }
            } 
            
            if (item.IsID) {

                if(!table._meta.progressDataServerIDSequence)
                    item.preventInsert = true;

                item.preventUpdate = true;                

                table._meta.idField = item.field.toLowerCase()
            }
            switch (item.field) {
                case 'CreateDateTime':
                    item = {  ...item, type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true };
                    break;
                case 'ModifyDateTime':
                case 'ChangeDT':
                    item = {  ...item, type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true };
                    break;
                case 'PlantId':
                    item = {  ...item, type: 'integer',defaultValueOnInsert:0 };
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

                    override[fieldName] = overrideSchema[f];
                 
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
    getDateTimeFromDateAndTime(d, t) {
        if (!d || !t)
            return null;
        let dat, time, moment = this.moment;
        if (d instanceof Date || d instanceof moment)
            dat = moment(d).format('YYYY-MM-DD');
        else
            dat = d;
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
    
    /**
	 * Takes a given Input and mutates it to be valid in a given SQL statement.  
	 * String ' are escaped to ''.  
	 * Objects are recursed over to escape them fully (this mutates the object).  
	 * null and undefined as coalesced into the empty string "".  
	 * Non problematic types are passed though without inspection.  
	 * @param {any} Input The Input to be escaped
	 * @returns {any} The Input not valid in a SQL statement
	 * */
    escape(Input) {
		if (Input === undefined || Input === null) {
			return '';
		}

		if (typeof Input == 'string') {
			if (Input.toLowerCase() == 'undefined' || Input.toLowerCase() == 'null') {
				return '';
			}

			return Input.replace(/'/, "''");
		}

		if (typeof Input == 'object') {
			for (let prop in Input) {
				Input[prop] = this.escape(Input[prop])
			}
			return Input;
		}

		return Input;
    }
    
    /** @returns {string | number} */
    _readWithSchema(fieldValue, obj, fieldModel, mode = 'insert') {
        const moment = this.moment;
        //Do advance validation here if needed
        //for instance {value:"2.3",type:"decimal"} then we will return parseFloat(fieldModel.value)
        //example 2 {value}
        if (mode == 'insert' && fieldModel.insertSequence && (fieldValue == null || fieldModel.preventInsert)) {
            return `(NEXT VALUE FOR ${this.dbPrefix}${this.schemaOwner}.${fieldModel.insertSequence})`;
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
        switch (fieldModel.type.trim()) {
            case 'date':
                fieldModel.format = fieldModel.format || this.dateFormat;
                if (!fieldValue)
                    return null;
                else if (fieldValue instanceof Date) {
                    return `'${moment(fieldValue).format(fieldModel.format)}'`;
                }
                else if (fieldValue instanceof moment)
                    return `'${fieldValue.format(fieldModel.format)}'`;
                else if (fieldValue === 'CURRENT_TIMESTAMP' || fieldValue === 'SYSTIMESTAMP' || fieldValue === 'SYSDATE')
                    return `'${moment().format(fieldModel.format)}'`;
                else if (moment(fieldValue, this.validDateFormats, false).isValid())
                    return `'${moment(fieldValue, this.validDateFormats, false).format(fieldModel.format)}'`;
                else
                    return null;
                break;
            case 'datetime':
                fieldModel.format = fieldModel.format || this.dateTimeFormat;
                if (!fieldValue)
                    return null;
                else if (fieldValue instanceof Date) {
                    return `'${moment(fieldValue).format(fieldModel.format)}'`;
                }
                else if (fieldValue instanceof moment)
                    return `'${fieldValue.format(fieldModel.format)}'`;
                else if (fieldValue === 'getdate()' || fieldValue === 'CURRENT_TIMESTAMP' || fieldValue === 'SYSTIMESTAMP' || fieldValue === 'SYSDATE')
                    return (fieldModel.dbType !== 'datetime')?`'${moment().format(fieldModel.format)}'`:`CURRENT_TIMESTAMP`;  //varchars can be defined as datetime 
                else if (moment(fieldValue, this.validDateTimeFormats, false).isValid())
                    return `'${moment(fieldValue, this.validDateTimeFormats, false).format(fieldModel.format)}'`;
                else
                    return null;
                break;
            case 'time':
                fieldModel.format = fieldModel.format || this.timeFormat;
                if (!fieldValue)
                    return null;
                else if (fieldValue instanceof Date) {
                    return `'${moment(fieldValue).format(fieldModel.format)}'`;
                }
                else if (fieldValue instanceof moment)
                    return `'${fieldValue.format(fieldModel.format)}'`;
                else if (fieldValue === 'CURRENT_TIMESTAMP' || fieldValue === 'SYSTIMESTAMP' || fieldValue === 'SYSDATE')
                    return `'${moment().format(fieldModel.format)}'`;
                else if (moment(fieldValue, this.validTimeFormats, false).isValid())
                    return `'${moment(fieldValue, this.validTimeFormats, false).format(fieldModel.format)}'`;
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
                return `'${(fieldValue) ? 1 : 0}'`;
                break;
            default: //default should be string
                if (fieldValue == null || fieldValue == 'null')
                    return null;
                return `'${this.escape(fieldValue)}'`;
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
    _nvpToObject(n) {
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
    _objectToNvp(obj) {
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
    //returns the copy of schema in lowercase properties
    
    /** @returns {{}} */
    _getLowerCasedSchema(schema) {
        let lcSchema = {};
        Object.keys(schema).map(fieldName => {
            lcSchema[fieldName.toLowerCase()] = { fieldName, fieldSchema: schema[fieldName] };
        });
        return lcSchema;
    }
    
    /** @returns {any} */
    _normalizeNVPFields(obj, schema) {
        if (!obj.NameValuePairs)
            return obj;
        //step 1) make schema keys lowercase
        let schemaLC = this._getLowerCasedSchema(schema);
        //step 2) convert nvp to lower cased object so that we
        let NVP = this._nvpToObject(obj.NameValuePairs);
        let FinalNVP = {}, fieldNamesToRemoveFromNVP = [];
        for (let prop in NVP) {
            let fieldObj = schemaLC[prop];
            if (fieldObj == null)
                continue;
            if (obj[fieldObj.fieldName] != null) { //if there is already value assigned to actual field then it takes precedence over NVP value
                fieldNamesToRemoveFromNVP.push(prop);
                continue;
            }
            let fieldSchema = fieldObj.fieldSchema;
            if (typeof fieldSchema === 'string')
                fieldSchema = { type: fieldSchema };
            let fieldValue = NVP[prop]; //get NVP value
            //convert nvp value
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
            if (fieldValue == null)
                continue;
            fieldNamesToRemoveFromNVP.push(prop);
            FinalNVP[fieldObj.fieldName] = fieldValue;
        }
        for (let prop of fieldNamesToRemoveFromNVP) {
            delete NVP[prop];
        }
        obj.NameValuePairs = this._objectToNvp(NVP);
        obj = Object.assign(obj, FinalNVP);
        return obj;
    }
    
    /** @returns {{}} */
    _copy(params) {
        let moment = this.moment;
        let obj = {}; //let obj = JSON.parse(JSON.stringify(params))//copying
        for (let i in params) {
            let val = params[i];
            let key = String(i).replaceAll('-','_').toLowerCase();
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
    //reason needed it to gracefully handle nulls and other invalid data types from insert quries 
    //use it for complex insert statments For rudementary inserts with less fields I would prefer
    //old school way but it still works
    
    /** @returns {{ fields: any[]; values: any[]; }} */
    generateInsertQueryDataHelper(params, schema) {
        let obj = this._copy(params);
        let fields = [], values = [];
        let val = '', fieldModel, requiredFails = {}, hasNVP = false,relatedFields = [],fieldValuesHash = {};

        let processField = (prop,isReprocessing = false) => {
            if (typeof fieldModel === 'string')
                fieldModel = { type: fieldModel };
            val = this._readWithSchema(val, obj, fieldModel);
            this._checkRequiredStatus(prop, val, fieldModel,requiredFails, 'insert');            

            if (val == null) {
                if(isReprocessing == false && (fieldModel.relatedDateField || fieldModel.relatedTimeField || fieldModel.relatedDateTimeField)){ //if there is any relatedFields then add it to array to process later
                    relatedFields.push({prop,fldModel:fieldModel});
                }
                delete obj[prop]; //null will be discarded
                return;
            }
            
            fieldValuesHash[prop] = val;

            values.push(val);
            fields.push(`"${prop}"`);
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
                if (this._fixNVP && schema['namevaluepairs']) {
                    obj = this._normalizeNVPFields(obj, schema);
                }
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
            if (typeof fieldModel === 'string')
                fieldModel = { type: fieldModel };
            val = this._readWithSchema(val, obj, fieldModel, 'update');
            this._checkRequiredStatus(prop, val, fieldModel,requiredFails, 'update');
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
                if (this._fixNVP && schema['namevaluepairs']) {
                    obj = this._normalizeNVPFields(obj, schema);
                }
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
                case 'date':
                    fieldName = `ISNULL(convert(varchar, ${prefix}"${fieldName}", 23),'') as '${fieldAlias}'`;
                    break;
                case 'datetime':
                    fieldName = `ISNULL(convert(varchar, ${prefix}"${fieldName}", 121),'') as '${fieldAlias}'`;
                    break;
                case 'time':
                    fieldName = `ISNULL(convert(varchar, ${prefix}"${fieldName}", 108),'') as '${fieldAlias}'`;
                    break;
                case 'string':
                    fieldName = `ISNULL(${prefix}"${fieldName}",'') as '${fieldAlias}'`;
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
            notEqual: 'notEqual',
            notEquals: 'notEqual',
            ne: 'notEqual',
            '!=': 'notEqual',
            '<>': 'notEqual',
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
    generateSimpleWhereClause(params, schema) {
        if (typeof params === 'string') //it means we are using costum where clause 
            return params.replace('where ', 'WHERE ').trim(' ');
        if (typeof schema === 'string')
            schema = this.getSchema(schema);
        let obj = this._copy(params);
        let whereSqlStr = '';
        let val = '', fieldModel;
        let processField = (prop) => {
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
                case 'notEqual':
                     whereSqlStr += ` "${prop}" != ${val} `;
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

        if (this.isProgressDataServer) {
            let data = await dbo.sql(`SET NOCOUNT ON;
            DECLARE @opval bigint;
            EXEC ${this.dbPrefix}${this.schemaOwner}._SEQP_REV_${seqName.toLowerCase()} 1, @opval output;
            SELECT @opval AS "${seqName}";`);
            if (data.length) {
                return data[0][seqName];
            }
            else {
                throw "Invalid Sequence";
            }
        }

        let data = await dbo.sql(`select NEXT VALUE FOR ${this.dbPrefix}${this.schemaOwner}.${seqName} as "${seqName}"`);
        if (data.length) {
            return data[0][seqName];
        }
        else {
            throw "Invalid Sequence";
        }
    }
    
     /**
     * @param {CfsNodeCore.DB} dbo 
     * @param {string} tableName 
     * @param {CfsNodeCore.ORM.FilterParams} query 
     * @param {CfsNodeCore.ORM.ReadOptionsParams} [options]  
     * @returns {Promise<CfsNodeCore.SqlResult | null>}      
    */
    async readOne(dbo, tableName, query,options = {}) {
        
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
    
    /**
     * 
     * @param {CfsNodeCore.DB} dbo 
     * @param {string} tableName 
     * @param {CfsNodeCore.ORM.FilterParams} query 
     * @param {CfsNodeCore.ORM.ReadOptionsParams} [options] 
     * @returns {Promise<Array<CfsNodeCore.SqlResult>>}
     */
    async read(dbo, tableName, query, options = {}) {
       
        let {schema} = options;

        if (!schema)
            schema = this.getSchema(tableName);

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
        let result = await dbo.sql(`SELECT ${top} ${this.makeSQLSelector(schema,null,options.fields)} 
                       FROM ${this.dbPrefix}${this.schemaOwner}."${tableName}" with (nolock)
                       ${where}
                        ${orderBy} ${offset} ${limit}`);

        if(typeof options.flatBy === 'string' && result.length && result[0][options.flatBy])
             result = result.map(item => item[options.flatBy])  //flatten the result

        return result;                
    }
    
    /** @returns {Promise<any>} */
    async insert(dbo, tableName, params, options = {}) {
        
        let {schema,returnResult} = options;

        if (!schema)
            schema = this.getSchema(tableName);
         
            
        let data;

        if(!Array.isArray(params))
            params = [params];

        let identityInsertSql = (schema._meta.identityInsert)?`SET IDENTITY_INSERT ${this.dbPrefix}${this.schemaOwner}."${tableName}" ON;`:''

        if (params.length) { 
            let values = [], fields;
            for (let row of params) {
               
                if(schema._meta.progressDataServerIDSequence){
                    row = this._copy(row) //just copy the params if there is progress dataserver 
                    row[schema._meta.idField] = await this.getNextSeq(dbo,schema._meta.progressDataServerIDSequence)
                }                
                data = this.generateInsertQueryDataHelper(row, schema);
                if (!fields)
                    fields = data.fields;
                values.push(`(${data.values})`);
            }

            await dbo.sql(`${identityInsertSql}INSERT INTO ${this.dbPrefix}${this.schemaOwner}."${tableName}" (${fields}) VALUES ${values.join(',')}`);
            let results = [];
            if(returnResult){               
                for(let row of params){
                    let result = await this.readOne(dbo,tableName,row)
                    results.push(result);
                }
            }
            return results; 
        }            

    }
    
    /** @returns {Promise<any>} */
    async update(dbo, tableName, params, query,options = {}) {
        
        let {schema,returnResult} = options;

        if (!schema)
            schema = this.getSchema(tableName);
        let where = this.generateSimpleWhereClause(query, schema);
        if (!where.startsWith('WHERE '))
            throw { code: 'PROVIDE_FILTER_CRITERIA', message: `Please provide valid filter criteria` };
        //archiving previous     
        //await dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}_History" select * from ${this.schemaOwner}."${tableName}_History" ${where} `)
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
            schema = this.getSchema(tableName);
        let where = this.generateSimpleWhereClause(query, schema);
        if (!where.startsWith('WHERE '))
            throw `Cannot delete without filter criteria`;
        //archiving previous     
        //await dbo.sql(`INSERT INTO ${this.dbPrefix}${this.schemaOwner}."${tableName}_History" select * from ${this.dbPrefix}${this.schemaOwner}."${tableName}_History" ${where} `)
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

module.exports = SqlServerORM