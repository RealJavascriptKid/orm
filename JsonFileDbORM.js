
class JsonFileDbORM {
  constructor(opts) {
    this._schemas = {};
    this._schemaPath = null;
    this._dataPath = null;
    this._sequenceMap = null;
    this._jsonSpaces = 4;
    this._overrideSchemaStrict = null;
    this._fixNVP = null;
    this._storage = {};
    this._indexStorage = {}
    this._useIndexes = false; //global flag for using indexes
    this._memoryOnly = false; //means no schema files or that files

    return this._init(opts);
  }

  async _init({
    dbName,
    schemaPath,
    dataPath, //file where we want to store the data of JSON data 
    useIndexes,  
    dateFormat,
    dateTimeFormat,
    timeFormat,
    overrideSchemaStrict,
    jsonSpaces,
    schemaOptions,
    fixNVPs, //CFS NVP fields
    memoryOnly
  }) {
    if (!dataPath || typeof dataPath !== "string")
      throw `"dataPath" must be provided. It is needed to to read and store database data`;

    if (!dbName) throw `"dbName" must be provided`;

    this._fixNVP = fixNVPs || false; //if true then when inserting or updating if there is NameValuePairs field and there is corresponding field in schema it will remove it from NVP and put it in real field
    this._useIndexes = useIndexes || false; 
    this.dbName = dbName;
    this.type = "jsonfiledb";
    this.schemaOptions = schemaOptions || {};
    this.moment = require("moment");
    this.dateFormat = dateFormat || "YYYY-MM-DD"; //used alongside moment
    this.dateTimeFormat = dateTimeFormat || "YYYY-MM-DD HH:mm:ss";
    this.timeFormat = timeFormat || "HH:mm:ss";
    this._overrideSchemaStrict = overrideSchemaStrict || false; //if true then after schema is overriden then it will REMOVE fields that are NOT overridden
    this._memoryOnly = memoryOnly || false;  //if this flag is true the it void schemaPath and dataPath



    this._dataPath = dataPath;
    if(!this._dataPath.endsWith('/'))
        this._dataPath += '/';

    this._schemaPath =  schemaPath || `./schemas/jsonfiledb/${this.dbName.toLowerCase()}/`
    if(!this._schemaPath.endsWith('/'))
        this._schemaPath += '/';

    if(this._schemaPath === this._dataPath)
       throw `Schema and Data folders should be seperated`     

    this.validDateFormats = ['MM/DD/YYYY', 'MM/DD/YY', 'M/D/YYYY', 'M/D/YY', 'YYYY-MM-DD'];

    this.validTimeFormats = ['HH:mm:ss','HH:mm','HHmm','HHmmss'];
    
    this.validDateTimeFormats = ['MM/DD/YYYY HH:mm:ss', 'MM/DD/YY HH:mm:ss', 'M/D/YYYY HH:mm:ss', 'M/D/YY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss',
                                    'MM/DD/YYYY HH:mm', 'MM/DD/YY HH:mm', 'M/D/YYYY HH:mm', 'M/D/YY HH:mm', 'YYYY-MM-DD HH:mm',
                                    'MM/DD/YYYY HHmm', 'MM/DD/YY HHmm', 'M/D/YYYY HHmm', 'M/D/YY HHmm', 'YYYY-MM-DD HHmm',
                                    'MM/DD/YYYY HHmmss', 'MM/DD/YY HHmmss', 'M/D/YYYY HHmmss', 'M/D/YY HHmmss', 'YYYY-MM-DD HHmmss'];

    //this._sequenceMap = require(`./schemas/sqlserver/${this.dbName.toLowerCase()}/tableSequenceMap.json`); //used by getTableSchema to automatically figure out ID fields

    if(jsonSpaces != null)
        this._jsonSpaces = jsonSpaces;
    return this;
  }

  async _readAllJsonFilesInFolderAsObject(dir){

    const fs = require('fs');
    const path = require('path')

    const jsonsInDir = fs.readdirSync(dir).filter(file => path.extname(file) === '.json');

    let jsonFiles = {}
    jsonsInDir.forEach(file => {
      const fileData = fs.readFileSync(path.join(dir, file));
      const json = JSON.parse(fileData.toString());
      jsonFiles[path.parse(file).name] = json;
    });

    return jsonFiles;

  }

   _applyIndexPriorities(schema){

    //restructure indexes object to prioritize indexes

    if(!schema._meta.indexes)
          return

      let priority = []
      for(let idxName in schema._meta.indexes){
          schema._meta.indexes[idxName].idxName = idxName;
          priority.push({
              name:idxName,
              fields:schema._meta.indexes[idxName]
          });
      }
      schema._meta.indexesPriority = priority.sort((a,b) => b.fields.length - a.fields.length);    
  }


  async _populateData(tableName,schema,tableData = {}) {
    
    
      const path = require('path')
        
      if(!this._memoryOnly){

            schema  = await this._readFile(path.join(this._schemaPath, `${tableName}.json`));
          
            tableData = await this._readFile(path.join(this._dataPath, `${tableName}.json`),'{}');

      }
    

    if(schema){
      
        this._schemas[tableName] = schema;

        if(!schema._meta)
            schema._meta = {};
        
        
        this._applyIndexPriorities(schema)

        for(let i in schema){

            let field = schema[i];

            if(i === '_meta' || typeof field !== 'object')
              continue;

            //finding id field
            if(field.isID){
                schema._meta.idField = i;
                schema._meta.autoId = field.autoId || false
                break;
            }


        }

        if(!schema._meta.idField)
            throw `Unable to populate ${tableName} Id field is not specified in schema`

    }
        


    this._storage[tableName] = tableData;  

    // if(typeof tableData._meta !== 'object' || Array.isArray(tableData._meta)){
    //     tableData._meta = {
    //         sequenceValues:{}, //pretenting to be db sequences
    //     }
    // }
    
    if(!this._useIndexes)           
        return;
    
      
    for(let id in tableData){        
        await this._addRowToIndexes(tableData[id],tableName,schema)
    }

  }

  getAllSchema(){
    return JSON.parse(JSON.stringify(this._schemas))   //we always should return the copy of schema so that it won't get mutated
  }

  async getSchema(schema) {
    if(schema === '_meta')
        throw `"_meta" is reserved key cannot use it has tableName`
    if (!this._schemas[schema]){
         await this._populateData(schema)
    } 
    try{
      return JSON.parse(JSON.stringify(this._schemas[schema])); //we always should return the copy of schema so that it won't get mutated
    }catch(ex){
        return null;
    }
    
  }

  getDateTimeFromDateAndTime(dt, t) {
    if (!dt || !t) return null;

    let dat,
      time,
      moment = this.moment;

    if (dt instanceof Date || dt instanceof moment)
      dat = moment(dt).format("YYYY-MM-DD");
    else dat = dt;

    if (t instanceof Date || t instanceof moment)
      time = moment(t).format("HH:mm:ss");
    else time = t;

    if (!time.includes(":")) {
      if (time.length == 4)
        time = time.substr(0, 2) + ":" + time.substr(2, 2) + ":00";
      else if (time.length == 6)
        time =
          time.substr(0, 2) + ":" + time.substr(2, 2) + ":" + time.substr(4, 2);
    }

    return `${dat} ${time}`;
  }

  escape(str) {
    //used for putting quotes in queries

    let strMagic = function (s) {
      if (s == "null" || s == "undefined") s = "";
      s = s.replace(/'/g, "''");
      return s;
    };

    if (typeof str === "object") {
      for (let prop in str) {
        if (typeof str[prop] === "string")
          str[prop] = strMagic(str[prop]); //removing quotes
        else if (typeof str[prop] === "undefined" || str[prop] === null)
          str[prop] = "";
      }
      return str;
    } else if (typeof str === "string") return strMagic(str); //removing quotes
    else if (typeof str === "undefined" || str === null) str = "";

    return str;
  }

  _readWithSchema(fieldValue, obj, fieldModel, mode = "insert") {
    const moment = this.moment;
    //Do advance validation here if needed
    //for instance {value:"2.3",type:"decimal"} then we will return parseFloat(fieldModel.value)
    //example 2 {value}

    if (
      mode == "insert" &&
      fieldModel.insertSequence &&
      (fieldValue == null || fieldModel.preventInsert)
    ) {
      return `(NEXT VALUE FOR ${this.schemaOwner}.${fieldModel.insertSequence})`;
    }

    if (fieldModel.preventUpdate && mode == "update") return null;
    else if (fieldModel.preventInsert && mode == "insert") return null;

    if (!fieldModel.type) {
      fieldModel.type = "any";
      // if(fieldModel instanceof Date){
      //     fieldModel = {type:'date',value:moment(fieldModel).format(this.dateFormat)}
      // }else if(fieldModel instanceof moment)
      //     fieldModel = {type:'date',value:fieldModel.format(this.dateFormat)}
      // else
      //     fieldModel.type = 'string';
    }

    if (!fieldModel.alternatives) fieldModel.alternatives = [];

    if (typeof fieldValue == "undefined") {
      for (let alt of fieldModel.alternatives) {
        if (typeof obj[alt] !== "undefined") {
          fieldValue = obj[alt];
          break;
        }
      }
      if (typeof fieldValue == "undefined") {
        //if it is still undefined then return

        if (
          mode == "insert" &&
          typeof fieldModel.defaultValueOnInsert !== "undefined"
        )
          fieldValue = fieldModel.defaultValueOnInsert;
        else if (
          mode == "update" &&
          typeof fieldModel.defaultValueOnUpdate !== "undefined"
        )
          fieldValue = fieldModel.defaultValueOnUpdate;
        else return null;
      }
    }

    if (fieldModel.type == "any") {
      fieldModel = this._determineFieldModel(fieldValue);
    }

    switch (fieldModel.type) {
      case "date":
        fieldModel.format = fieldModel.format || this.dateFormat;
        if (!fieldValue) return null;
        else if (fieldValue instanceof Date) {
          return `${moment(fieldValue).format(fieldModel.format)}`;
        } else if (fieldValue instanceof moment)
          return `${fieldValue.format(fieldModel.format)}`;
        else if (fieldValue === "CURRENT_TIMESTAMP")
          return `${moment().format(fieldModel.format)}`;
        else if (moment(fieldValue, this.validDateFormats, false).isValid())
          return `${moment(fieldValue, this.validDateFormats, false).format(fieldModel.format)}`;
        else return null;
        break;
      case "datetime":
        fieldModel.format = fieldModel.format || this.dateTimeFormat;
        if (!fieldValue) return null;
        else if (fieldValue instanceof Date) {
          return `${moment(fieldValue).format(fieldModel.format)}`;
        } else if (fieldValue instanceof moment)
          return `${fieldValue.format(fieldModel.format)}`;
        else if (
          fieldValue === "getdate()" ||
          fieldValue === "CURRENT_TIMESTAMP"
        )
          return `${moment().format(fieldModel.format)}`;
        else if (moment(fieldValue, this.validDateTimeFormats, false).isValid())
          return `${moment(fieldValue, this.validDateTimeFormats, false).format(fieldModel.format)}`;
        else return null;

        break;
      case "time":
        fieldModel.format = fieldModel.format || this.timeFormat;
        if (!fieldValue) return null;
        else if (fieldValue instanceof Date) {
          return `${moment(fieldValue).format(fieldModel.format)}`;
        } else if (fieldValue instanceof moment)
          return `${fieldValue.format(fieldModel.format)}`;
        else if (fieldValue === "CURRENT_TIMESTAMP")
          return `${moment().format(fieldModel.format)}`;
        else if (moment(fieldValue,this.validTimeFormats, false).isValid())
          return `${moment(fieldValue,this.validTimeFormats, false).format(fieldModel.format)}`;
        else return null;
        break;
      case "integer":
        if (fieldValue == null) return null;
        else if (typeof fieldValue == "string" && !fieldValue.trim())
          return null;
        return parseInt(fieldValue);
        break;
      case "decimal":
        if (fieldValue == null) return null;
        else if (typeof fieldValue == "string" && !fieldValue.trim())
          return null;
        return parseFloat(fieldValue);
        break;
      case "boolean":
        if (fieldValue == null) return null;
        if (typeof fieldValue !== "boolean") {
          fieldValue = fieldValue + "";
          fieldValue = ["y", "yes", "1", "true"].includes(
            fieldValue.toLowerCase()
          )
            ? true
            : false;
        }
        return fieldValue;
        break;
      case "object": 
        if (typeof fieldValue !== "object")
            return null;
        return this._cloneResult(fieldValue)
        break;
      default: //default should be string
        if (fieldValue == null) return null;
        return `${this.escape(fieldValue)}`;
        break;
    }
  }

  _determineFieldModel(val) {
    const moment = this.moment;
    let fieldModel = { type: "string", alternatives: [] };

    if (val instanceof Date) {
      fieldModel.type = "date";
    } else if (val instanceof moment) {
      fieldModel.type = "date";
    } else if (typeof val == "boolean") fieldModel.type = "boolean";
    else if (typeof val == "number") {
      if (val % parseInt(val) == 0) fieldModel.type = "integer";
      else fieldModel.type = "decimal";
    }else if (typeof val == "object") {
       fieldModel.type = "object";
    }

    return fieldModel;
  }

  _nvpToObject(n) {
    if (!n) return {};
    var a = n.split("\u0002"),
      o = {},
      s = [];
    for (var i = 0; i < a.length; i++) {
      s = a[i].split("=");
      if (s.length == 2) o[s[0].toLowerCase()] = s[1];
    }
    return o;
  }

  _objectToNvp(obj) {
    let nvp = [];
    for (let prop in obj) {
      let item = obj[prop];
      if (
        typeof item == "undefined" ||
        typeof item == "object" ||
        typeof item == "function"
      ) {
        //nvp.push(prop.toLowerCase() + '=');
        continue;
      }
      nvp.push(prop.toLowerCase() + "=" + item);
    }
    return nvp.join("\u0002");
  }

  //returns the copy of schema in lowercase properties
  _getLowerCasedSchema(schema) {
    let lcSchema = {};
    Object.keys(schema).map((fieldName) => {
      lcSchema[fieldName.toLowerCase()] = {
        fieldName,
        fieldSchema: schema[fieldName],
      };
    });

    return lcSchema;
  }

  _normalizeNVPFields(obj, schema) {
    if (!obj.NameValuePairs) return obj;

    //step 1) make schema keys lowercase
    let schemaLC = this._getLowerCasedSchema(schema);

    //step 2) convert nvp to lower cased object so that we
    let NVP = this._nvpToObject(obj.NameValuePairs);
    let FinalNVP = {},
      fieldNamesToRemoveFromNVP = [];

    for (let prop in NVP) {
      let fieldObj = schemaLC[prop];
      if (fieldObj == null) continue;

      if (obj[fieldObj.fieldName] != null) {
        //if there is already value assigned to actual field then it takes precedence over NVP value
        fieldNamesToRemoveFromNVP.push(prop);
        continue;
      }

      let fieldSchema = fieldObj.fieldSchema;

      if (typeof fieldSchema === "string") fieldSchema = { type: fieldSchema };

      let fieldValue = NVP[prop]; //get NVP value

      //convert nvp value
      switch (fieldSchema.type) {
        // case 'date':

        //     break;
        // case 'datetime':

        //     break;
        // case 'time':

        //     break;
        case "integer":
          fieldValue = parseInt(fieldValue);
          break;
        case "decimal":
          fieldValue = parseFloat(fieldValue);
          break;
        case "boolean":
          fieldValue = ["y", "yes", "1", "true"].includes(
            fieldValue.toLowerCase()
          )
            ? true
            : false;
          break;
      }

      if (fieldValue == null) continue;

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

  _copy(params) {
    let moment = this.moment;
    let obj = {}; //let obj = JSON.parse(JSON.stringify(params))//copying

    for (let i in params) {
      let val = params[i];
      if (typeof val === "object") {
        if (val instanceof moment) obj[i] = val.clone();
        else if (val instanceof Date) obj[i] = new Date(val.getTime());
        else obj[i] = JSON.parse(JSON.stringify(val));
      } else obj[i] = params[i];
    }
    return obj;
  }

  _checkRequiredStatus(prop, val, fieldModel, requiredFails, mode = "insert") {
    if (
      mode == "insert" &&
      fieldModel.requiredOnInsert &&
      !fieldModel.preventInsert
    ) {
      if (val == null || (val === "" && fieldModel.type === "string"))
        requiredFails.push(prop);
    } else if (
      mode == "update" &&
      fieldModel.requiredOnUpdate &&
      !fieldModel.preventUpdate
    ) {
      if (val == null || (val === "" && fieldModel.type === "string"))
        requiredFails.push(prop);
    }
  }

  getAutoId(tableName){
     let id = Date.now().toString(36) + Math.floor(Math.pow(10, 12) + Math.random() * 9*Math.pow(10, 12)).toString(36);
     if(this._storage[tableName][id]) //if id is already used then recursively get another 1
        id = this.getAutoId(tableName)
     return id;
  }

  //reason needed it to gracefully handle nulls and other invalid data types from insert quries
  //use it for complex insert statments For rudementary inserts with less fields I would prefer
  //old school way but it still works
  _insertProcess(table,params, schema) {
    let obj = this._copy(params);
    let resultItem = {};
    let val = "",
      fieldModel,
      requiredFails = [],
      hasNVP = false;

    let processField = (prop) => {
      if (typeof fieldModel === "string") fieldModel = { type: fieldModel };

      val = this._readWithSchema(val, obj, fieldModel);

      this._checkRequiredStatus(prop, val, fieldModel, requiredFails, "insert");

      if (val == null) {
        delete obj[prop]; //null will be discarded
        return;
      }

      resultItem[prop] = val;
    };

    if (schema) {
        if (schema instanceof Array) {
          throw 'Invalid schema format. Scenma cannot be an array'
        }

        let idField = schema._meta.idField;

        if(schema._meta.autoId){
          obj[idField] = this.getAutoId(table)

        }else{

          if(obj[idField] == null)
            throw `ID must be provided`

        }

        if (this._fixNVP && schema["NameValuePairs"]) {
            obj = this._normalizeNVPFields(obj, schema);
        }

        for (let prop in schema) {
          if(prop === '_meta') //reserved
              continue;
            val = obj[prop];
            fieldModel = schema[prop];
            processField(prop);
        }
      
    } else {
      throw `Automatic schema cannot be determined yet. Please provide schema for this table`
      //automatically determine schema
      // schema = {}
      // for (let prop in obj) {
      //   val = obj[prop];
      //   fieldModel = this._determineFieldModel(val);
      //   schema[prop] = fieldModel;
      //   processField(prop);
      // }
      // this.schemas[table] = schema;
    }

    if (requiredFails.length) {
      throw {
        code: "MISSING_REQUIRED_PARAM",
        message: `Missing required params: ${requiredFails.join(",")}`,
        data: requiredFails,
      };
    }   
    return resultItem;
  }

  _updateProcess(params, schema) {
    let obj = this._copy(params);
    let updates = {};
    let val = "",
      fieldModel,
      requiredFails = [];

    let processField = (prop) => {
      
      if (typeof fieldModel === "string") fieldModel = { type: fieldModel };

      if(fieldModel.isID)
        fieldModel.preventUpdate = true; //we don't allow to update ID fields

      val = this._readWithSchema(val, obj, fieldModel, "update");

      this._checkRequiredStatus(prop, val, fieldModel, requiredFails, "update");

      if (val == null) {
        delete obj[prop]; //null will be discarded
        return;
      }
  
      updates[prop] = val;
    };

    if (schema) {
      if (schema instanceof Array) {
        throw `Schema cannot be an Array`
      } 
      if (this._fixNVP && schema["NameValuePairs"]) {
        obj = this._normalizeNVPFields(obj, schema);
      }

      for (let prop in schema) {
        if(prop === '_meta') //reserved
            continue;
        val = obj[prop];
        fieldModel = schema[prop];
        processField(prop);
      }
      
    } else {
      throw `Auto schema determination is not yet supported`
      // for (let prop in obj) {
      //   val = obj[prop];
      //   fieldModel = this._determineFieldModel(val);
      //   processField(prop);
      // }
    }

    if (requiredFails.length) {
      throw {
        code: "MISSING_REQUIRED_PARAM",
        message: `Missing required params: ${requiredFails.join(",")}`,
        data: requiredFails,
      };
    }

    return updates;
  }

  
  async getNextSeq(dbo, seqName) {
    let data = await dbo.sql(
      `select NEXT VALUE FOR ${this.schemaOwner}.${seqName} as "${seqName}"`
    );

    if (data.length) {
      return data[0][seqName];
    } else {
      throw "Invalid Sequence";
    }
  }

  async _applyIndex(tableName,schema,query){

        let idField = query[schema._meta.idField];
        if(idField != null){
          if(this._storage[tableName][idField])
            return [this._storage[tableName][idField]]
          return [];
        }
              

       if(!schema._meta || !schema._meta.indexesPriority || !schema._meta.indexesPriority.length)
            return  Object.values(this._storage[tableName]) // full table result 

        let currentidx,chooseCurrentIdx,key = [];
        for(currentidx of schema._meta.indexesPriority){
          
            key = []
            chooseCurrentIdx = true;
            for(let idxField of currentidx.fields){
                if(typeof query[idxField] === 'undefined'){
                    chooseCurrentIdx = false;
                    break; //break inner loop
                }
                key.push(query[idxField])
            }

            if(chooseCurrentIdx)
                break; //break outerloop
        }   

        
        
        if(currentidx.fields.length == key.length &&  this._indexStorage[tableName]){         
            let index = this._indexStorage[tableName][currentidx.name];
            let indexedData = (index)?index[key.join('|')]:null;
            
            if(indexedData){

                // We have found indexedData. Now mutate "query" to remove fields that have been used in index applied
                for(let idxField of currentidx.fields){
                  delete query[idxField]
                }
                console.log("retirning indexed data")
                return  Object.values(indexedData)
            }
        }      
        
        //it means none-of the index can be used. So, unfortunately return full table result
        return  Object.values(this._storage[tableName]) 
       
  }

  _cloneResult(result){
     return JSON.parse(JSON.stringify(result))
  }

  async _applyFilters(data,filters,limit){
       //WARNING DO NOT MUTATE this._storage or this.indexedStorage directly
      let result = [];

      for(let row of data){
          
           let accept = true;
           for(let i in filters){

              if(filters[i] != row[i]){

                  accept = false;
                  break;

              }

           }

           if(accept)
              result.push(row)
           

           if(limit && result.length >= limit)
              break;
           
      }
      return result;
  }

  async readOne(tableName, query) {    
    let result = await this.read(tableName,query,{limit:1});
    return result.length ? result[0] : null;
  }

  async read(tableName, query,options = {}) { 
    options.schema = await this.getSchema(tableName); 
    
    if(options.schema === null){
       return [];
    }

    let data = await this._read(tableName,query,options)
    return this._cloneResult(data) //we don't want internal data to be mutated by external code
  }

  async _read(tableName,query,options){

    let {limit,schema} = options;

    if(typeof query !== 'object'){  //if query is NOT object then we assume it to be ID field
        let val = query;
        query = {};
        query[schema._meta.idField] = val

        if(!val){ //if there is not where clause
          let result = Object.values(this._storage[tableName]);
          if(limit && limit < result.length)
              result = result.slice(0,limit)
          return this._cloneResult(result)
        }            
    }       
    
    let data = await this._applyIndex(tableName,schema,query)
    if(!data.length)
        return data;

    data = await this._applyFilters(data,query,limit)

    return data
  }

  async insert(tableName, params) {
        let schema = await this.getSchema(tableName);        

        let arr = (Array.isArray(params))?params:[params];

        if(schema === null){  //automatically adds the schema
           //it means we have to autodetermine schema
           schema = this.determineSchemaFromData(arr);
           if(schema){
              schema = await this.addSchema(tableName,schema)
           }
        }
       
       //I can use Promise.all() but for now I'm keeping it this way
       let recordsAdded = [];
       let results = this._storage[tableName] || {};
       for(let row of arr){

            let data = this._insertProcess(tableName, row, schema)
            await this._addRowToIndexes(data,tableName,schema)
            results[this._getRowId(data,schema)] = data
            recordsAdded.push(data);
       }

       if(recordsAdded.length === 1)
          return this._cloneResult(recordsAdded[0]); //we don't want external progam to mutate our data
          
        return this._cloneResult(recordsAdded); //we don't want external progam to mutate our data
  }

  async update(tableName, params, query,options = {}) {

    let dataToUpdate; 
    let schema = await this.getSchema(tableName);
    
    if(schema === null){

        //if schema is null then we want to add insert because there is nothing that exists
        await this.insert(tableName,params)
        dataToUpdate = await this._read(tableName,query,options);
        return this._cloneResult(dataToUpdate)
    }

    options.schema = schema;

    dataToUpdate = await this._read(tableName,query,options);

    let updates = this._updateProcess(params, schema);

    //TODO address indexes while updateing
    for(let row of dataToUpdate){

      await this._removeRowFromIndexes(row,tableName,schema)
      Object.assign(row,updates)
      await this._addRowToIndexes(row,tableName,schema)
    }

    return this._cloneResult(dataToUpdate)
   
  }

  async updateAll(tableName, params) {

    let schema = await this.getSchema(tableName);   

    if(schema === null){

        //if schema is null then we want to add insert because there is nothing that exists
        await this.insert(tableName,params)
        return
    }

    let updates = this._updateProcess(params, schema);

    //TODO address indexes while updateing
    for(let id in this._storage[tableName]){
      
      let row = this._storage[tableName][id];
      await this._removeRowFromIndexes(row,tableName,schema)
      Object.assign(row,updates)
      await this._addRowToIndexes(row,tableName,schema)
    }
   
  }

  async remove(tableName, query, options = {}) {
        
    let schema = await this.getSchema(tableName);
    if(schema === null)
        return []
    options.schema = schema;

    let dataToDelete = await this._read(tableName,query,options);

       //TODO address indexes while updateing
    for(let row of dataToDelete){

      await this._removeRowFromIndexes(row,tableName,schema)
      delete this._storage[tableName][this._getRowId(row,schema)]
    }

    return this._cloneResult(dataToDelete)
    
  }

  async removeAll(tableName){
      delete this._storage[tableName];
      delete this._indexStorage[tableName];
  }

  _getRowId(row,schema){
      return row[schema._meta.idField]
  }

  async _addRowToIndexes(row,table,schema){

    if(!schema._meta.indexActive || schema._meta.indexes == null)
        return;

    if(!this._indexStorage[table]){
        this._indexStorage[table] = {};
    }
       

    let idxStore = this._indexStorage[table];


    for(let idx in schema._meta.indexes){
        
      if(!idxStore[idx])
          idxStore[idx] = {};

      let key = [];    
      for(let field of schema._meta.indexes[idx]){ //iterate index fields to create key
        key.push(row[field])
      } 
      key = key.join('|');

      let  index = idxStore[idx]

      if(!index[key])
        index[key] = {}
      
      index[key][row[schema._meta.idField]] = row

    }

    if(!schema._meta.indexesPriority)
        this._applyIndexPriorities(schema)

}

  async _removeRowFromIndexes(row,table,schema){

      if(!schema._meta.indexActive || schema._meta.indexes == null)
          return;

      if(!this._indexStorage[table])
          return;

      let idxStore = this._indexStorage[table];

      for(let idx in schema._meta.indexes){
        
          if(!idxStore[idx])
              continue;
    
          let key = [];    
          for(let field of schema._meta.indexes[idx]){ //iterate index fields to create key
            key.push(row[field])
          } 
          key = key.join('|');
    
          let  index = idxStore[idx]
    
          if(!index[key])
            continue;
          
          delete index[key][row[schema._meta.idField]]
  
      }

  }

  async _writeFile(file,data) {
    if(this._memoryOnly)
        return;
      const fs = require('fs')
      return new Promise((res,rej) => {
          fs.writeFile(file, JSON.stringify(data, null, this.jsonSpaces), (err) => {
              if (err) return rej(err);
              res();
          });
      })  
  }

  async _readFile(file,defaultFileData) {
    if(this._memoryOnly)
        return {};
    const fs = require('fs'),
         path = require('path');

    let _read = () => {
      return new Promise((res,rej) => {
        fs.readFile(file, (err,fileData) => {
            if (err) return rej(err); 
            res(JSON.parse(fileData.toString()));
        });
    })  
    }

    let _ensure = async (filePath) => {
      var dirname = path.dirname(filePath);
      if (fs.existsSync(dirname)) {       
        return true;        
      }
      await _ensure(dirname);
      fs.mkdirSync(dirname);
    }

    try{
       let result = await _read();
       return result;
    }catch(ex){
        await _ensure(file);
        if(defaultFileData){
          await this._writeFile(file,JSON.parse(defaultFileData))
       }
        return _read()
    }

   
}

  async commit() {
      if(this._memoryOnly)
        return;
      const path = require('path')
      for(let tableName in this._storage){
          await this._writeFile(path.join(this._dataPath, `${tableName}.json`),this._storage[tableName])
      }
  }

  determineSchemaFromData(data){

      let params = JSON.parse(JSON.stringify(data));
      if(params != null && !Array.isArray(params)){         
          params =[params]
      }

      let schema = {},idField = '';

      for(let param of params){

        for(let i in param){

          if(schema[i] == null)
            schema[i] = this._determineFieldModel(param[i]);

           if(!idField && i.toLowerCase() === 'id'){
              idField = i;
           }

           schema[i].isID = true;

        }

      }  
      
      if(schema._meta == null){
          schema._meta = {
              
          }
      }

      //determining id field
      

      return schema;

  }

  async addSchema(tableName,schema){
      const path = require('path')

      let dataExists = false,oldSchema,isNewSchema = false;
      try{

        oldSchema = await this.getSchema(tableName);  
        if(oldSchema === null)
           throw `Schema does not exist`
        let data = this._storage[tableName]?Object.values(this._storage[tableName]):[];
        if(data.length)  //if there is data then don't set schema
          dataExists = true;       

      }catch(ex){
        oldSchema = {}
        isNewSchema = true;
      }
      
      if(isNewSchema || !dataExists){

        schema = {...oldSchema,...schema};        

        if(!this._memoryOnly){

          await this._writeFile(path.join(this._schemaPath, `${tableName}.json`),schema) 

        }else{

           await this._populateData(tableName,schema)

        } 
        return this.getSchema(tableName);  
      }
      
  }

  async removeSchema(tableName){
      const path = require('path')

      if(!this._schemas[tableName])
          return;

      this.removeAll(tableName)
       
      delete this._schemas[tableName];

      if(!this._memoryOnly)
        this.rm(path.join(this._schemaPath, `${tableName}.json`)) //deleting schema
      
  }

  rm(directoryPath) {
    var self = this;
    const fs = require('fs'),
        path = require('path');

    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file, index) => {
            const curPath = path.join(directoryPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                self.rm(curPath);
            } else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(directoryPath);
    }
  }

  

};

module.exports = JsonFileDbORM