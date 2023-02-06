
module.exports = class JsonFileDbORM {
  constructor(opts) {
    this._schemas = null;
    this._schemaPath = null;
    this._dataPath = null;
    this._sequenceMap = null;
    this._jsonSpaces = 4;
    this._overrideSchemaStrict = null;
    this._fixNVP = null;
    this._storage = {};
    this._indexStorage = {}
    this._useIndexes = false; //global flag for using indexes

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
  

    this._dataPath = dataPath;
    if(!this._dataPath.endsWith('/'))
        this._dataPath += '/';

    this._schemaPath =  schemaPath || `./schemas/jsonfiledb/${this.dbName.toLowerCase()}/`
    if(!this._schemaPath.endsWith('/'))
        this._schemaPath += '/';

    if(this._schemaPath === this._dataPath)
       throw `Schema and Data folders should be seperated`     

    //this._sequenceMap = require(`./schemas/sqlserver/${this.dbName.toLowerCase()}/tableSequenceMap.json`); //used by getTableSchema to automatically figure out ID fields

    if(jsonSpaces != null)
        this._jsonSpaces = jsonSpaces;

    await this._populateData();
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


  async _updateRecordIndexes(rowId,row,table,schema){

      if(!schema._meta || !schema._meta.indexActive || schema._meta.indexes == null)
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
          index[key] = []
        
        index[key].push(row)

      }

  }

  async _populateData() {

    this._schemas  = await this._readAllJsonFilesInFolderAsObject(this._schemaPath);
   
    let data = await this._readAllJsonFilesInFolderAsObject(this._dataPath);

    for(let tableName in data){
        let schema = this._schemas[tableName];
        if(!schema)
            continue;

        this._storage[tableName] = data[tableName];  

        let tableData  = this._storage[tableName];

         if(typeof tableData._meta !== 'object' || Array.isArray(tableData._meta)){
            tableData._meta = {
                sequenceValues:{}, //pretenting to be db sequences
            }
        }
        
        if(!this._useIndexes)           
             continue;  //we are not using indexes so no point to index data
        
         
        for(let id in tableData){
            if(id === '_meta')
               continue;
            await this._updateRecordIndexes(id,tableData[id],tableName,schema)
        }

    }

     
      // this._storage = data;
    
      //this._storage = data;

  }

  getSchema(schema) {
    if(schema === '_meta')
        throw `"_meta" is reserved key cannot use it has tableName`
    if (!this.schemas[schema]) 
        return null;

    return JSON.parse(JSON.stringify(this.schemas[schema])); //we always should return the copy of schema so that it won't get mutated
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
          return `'${moment(fieldValue).format(fieldModel.format)}'`;
        } else if (fieldValue instanceof moment)
          return `'${fieldValue.format(fieldModel.format)}'`;
        else if (fieldValue === "CURRENT_TIMESTAMP")
          return `'${moment().format(fieldModel.format)}'`;
        else if (moment(fieldValue, fieldModel.format, false).isValid())
          return `'${moment(fieldValue).format(fieldModel.format)}'`;
        else return null;
        break;
      case "datetime":
        fieldModel.format = fieldModel.format || this.dateTimeFormat;
        if (!fieldValue) return null;
        else if (fieldValue instanceof Date) {
          return `'${moment(fieldValue).format(fieldModel.format)}'`;
        } else if (fieldValue instanceof moment)
          return `'${fieldValue.format(fieldModel.format)}'`;
        else if (
          fieldValue === "getdate()" ||
          fieldValue === "CURRENT_TIMESTAMP"
        )
          return `${fieldValue}`;
        else if (fieldValue === "CURRENT_TIMESTAMP")
          return `'${moment().format(fieldModel.format)}'`;
        else if (moment(fieldValue, fieldModel.format, false).isValid())
          return `'${moment(fieldValue, fieldModel.format).format(
            fieldModel.format
          )}'`;
        else return null;

        break;
      case "time":
        fieldModel.format = fieldModel.format || this.timeFormat;
        if (!fieldValue) return null;
        else if (fieldValue instanceof Date) {
          return `'${moment(fieldValue).format(fieldModel.format)}'`;
        } else if (fieldValue instanceof moment)
          return `'${fieldValue.format(fieldModel.format)}'`;
        else if (fieldValue === "CURRENT_TIMESTAMP")
          return `'${moment().format(fieldModel.format)}'`;
        else if (moment(fieldValue, fieldModel.format, false).isValid())
          return `'${moment(fieldValue, fieldModel.format).format(
            fieldModel.format
          )}'`;
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
        return `'${fieldValue ? 1 : 0}'`;
        break;
      default: //default should be string
        if (fieldValue == null) return null;
        return `'${this.escape(fieldValue)}'`;
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
      if (val == null || (val === "''" && fieldModel.type === "string"))
        requiredFails.push(prop);
    } else if (
      mode == "update" &&
      fieldModel.requiredOnUpdate &&
      !fieldModel.preventUpdate
    ) {
      if (val == null || (val === "''" && fieldModel.type === "string"))
        requiredFails.push(prop);
    }
  }

  //reason needed it to gracefully handle nulls and other invalid data types from insert quries
  //use it for complex insert statments For rudementary inserts with less fields I would prefer
  //old school way but it still works
  generateInsertQueryDataHelper(table,params, schema) {
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
      //automatically determine schema
      schema = {}
      for (let prop in obj) {
        val = obj[prop];
        fieldModel = this._determineFieldModel(val);
        schema[prop] = fieldModel;
        processField(prop);
      }
      this.schemas[table] = schema;
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

  generateUpdateQueryDataHelper(params, schema) {
    let obj = this._copy(params);
    let updateSqlStr = "";
    let val = "",
      fieldModel,
      requiredFails = [];

    let processField = (prop) => {
      if (typeof fieldModel === "string") fieldModel = { type: fieldModel };

      val = this._readWithSchema(val, obj, fieldModel, "update");

      this._checkRequiredStatus(prop, val, fieldModel, requiredFails, "update");

      if (val == null) {
        delete obj[prop]; //null will be discarded
        return;
      }

      if (updateSqlStr.length) updateSqlStr += ", ";
      updateSqlStr += ` "${prop}" = ${val} `;
    };

    if (schema) {
      if (schema instanceof Array) {
        fieldModel = { type: "any" };
        for (let prop of schema) {
          val = obj[prop];
          processField(prop);
        }
      } else {
        if (this._fixNVP && schema["NameValuePairs"]) {
          obj = this._normalizeNVPFields(obj, schema);
        }

        for (let prop in schema) {
          if(fieldName === '_meta') //reserved
              continue;
          val = obj[prop];
          fieldModel = schema[prop];
          processField(prop);
        }
      }
    } else {
      for (let prop in obj) {
        val = obj[prop];
        fieldModel = this._determineFieldModel(val);
        processField(prop);
      }
    }

    if (requiredFails.length) {
      throw {
        code: "MISSING_REQUIRED_PARAM",
        message: `Missing required params: ${requiredFails.join(",")}`,
        data: requiredFails,
      };
    }

    return updateSqlStr;
  }

  makeSQLSelector(schema, prefix) {
    if (typeof schema === "string") schema = this.getSchema(schema);

    prefix = prefix ? prefix + "." : "";

    if (Array.isArray(schema)) {
      return schema.map((fieldName) => `${prefix}"${fieldName}"`).join(",");
    }

    let fields = [];
    for (let fieldName in schema) {
      if(fieldName === '_meta') //reserved
         continue;
      let type = schema[fieldName];
      if (typeof type === "object") {
        if (type.preventSelection)
          //means our schema has defined that we don't want this field to apear in select clause
          continue;
        type = type.type;
      }

      switch (type) {
        case "date":
          fieldName = `convert(varchar, ${prefix}"${fieldName}", 23) as '${fieldName}'`;
          break;
        case "datetime":
          fieldName = `convert(varchar, ${prefix}"${fieldName}", 121) as '${fieldName}'`;
          break;
        case "string":
          fieldName = `ISNULL(${prefix}"${fieldName}",'') as '${fieldName}'`;
          break;
        default:
          fieldName = `${prefix}"${fieldName}"`;
          break;
      }
      fields.push(fieldName);
    }
    return fields.join(",");
  }

  generateSimpleWhereClause(params, schema) {
    if (typeof schema === "string") schema = this.getSchema(schema);

    let obj = this._copy(params);
    let whereSqlStr = "";
    let val = "",
      fieldModel;

    let processField = (prop) => {
      if (typeof fieldModel === "string") fieldModel = { type: fieldModel };

      val = this._readWithSchema(val, obj, fieldModel, "whereclause");

      if (val == null) {
        delete obj[prop]; //null will be discarded
        return;
      }

      if (whereSqlStr.length) whereSqlStr += " AND ";
      whereSqlStr += ` "${prop}" = ${val} `;
    };

    if (schema) {
   
        for (let prop in schema) {
          if(prop === '_meta') //reserved
              continue;
          val = obj[prop];
          fieldModel = schema[prop];
          processField(prop);
        }
    } else {
      for (let prop in obj) {
        val = obj[prop];
        fieldModel = this._determineFieldModel(val);
        processField(prop);
      }
    }

    if (whereSqlStr.length) whereSqlStr = `WHERE ${whereSqlStr}`;

    return whereSqlStr;
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

  async readOne(tableName, query, schema) {
    if (!schema) schema = this.getSchema(tableName);

    let where = this.generateSimpleWhereClause(query, schema);

    if (!where.startsWith("WHERE "))
      throw {
        code: "PROVIDE_FILTER_CRITERIA",
        message: `Please provide valid filter criteria`,
      };

    let result = await dbo.sql(`SELECT top 1 ${this.makeSQLSelector(schema)} 
                    FROM ${this.schemaOwner}."${tableName}" with (nolock)
                    ${where}
                    `);
    return result.length ? result[0] : null;
  }

  async read(tableName, query) {
    let schema = this.getSchema(tableName);

    let where = this.generateSimpleWhereClause(query, schema);

    if (!where.startsWith("WHERE "))
      throw {
        code: "PROVIDE_FILTER_CRITERIA",
        message: `Please provide valid filter criteria`,
      };

    return dbo.sql(`SELECT ${this.makeSQLSelector(schema)} 
                       FROM ${this.schemaOwner}."${tableName}" with (nolock)
                       ${where}
                       `);
  }

  async insert(tableName, params, schema) {
    if (!schema) schema = this.getSchema(tableName);

        let arr = (Array.isArray(params))?params:[params];
       
       //I can use Promise.all() but for now I'm keeping it this way
       let recordsAdded = [];
       let results = this._storage[tableName] || [];
       for(let row of arr){

            let data = this.generateInsertQueryDataHelper(tableName, row, schema)
            results.push(data)
            data._id = results.length;
            recordsAdded.push(JSON.parse(JSON.stringify(data)));
       }

       if(recordsAdded.length === 1)
          return recordsAdded[0];
          
        return recordsAdded;
  }

  async update(tableName, params, query, schema) {
    if (!schema) schema = this.getSchema(tableName);

    let where = this.generateSimpleWhereClause(query, schema);

    if (!where.startsWith("WHERE "))
      throw {
        code: "PROVIDE_FILTER_CRITERIA",
        message: `Please provide valid filter criteria`,
      };

    //archiving previous
    //await dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}_History" select * from ${this.schemaOwner}."${tableName}_History" ${where} `)

    let updateSqlStr = this.generateUpdateQueryDataHelper(params, schema);

    return dbo.sql(`UPDATE ${this.schemaOwner}."${tableName}" 
               SET                 
               ${updateSqlStr}
               ${where} 
               `);
  }

  async remove(tableName, query, schema) {
    if (!schema) schema = this.getSchema(tableName);

    let where = this.generateSimpleWhereClause(query, schema);

    if (!where.startsWith("WHERE "))
      throw `Cannot delete without filter criteria`;

    //archiving previous
    //await dbo.sql(`INSERT INTO ${this.schemaOwner}."${tableName}_History" select * from ${this.schemaOwner}."${tableName}_History" ${where} `)

    return dbo.sql(`DELETE FROM ${this.schemaOwner}."${tableName}" ${where}`);
  }

  async _write(file,data) {
      const fs = require('fs')
      return new Promise((res,rej) => {
          fs.writeFile(file, JSON.stringify(data, null, this.jsonSpaces), (err) => {
              if (err) return rej(err);
              res();
          });
      })  
  }

  async commit() {
      const path = require('path')
      for(let tableName in this._storage){
          await this._write(path.join(this._storage[tableName], `${tableName}.json`))
      }
  }
};
