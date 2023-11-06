if (!String.prototype.equals){String.prototype.equals = function(strCmp){ return this.localeCompare(strCmp, undefined, { sensitivity: 'base' }) === 0}}
if (!Number.prototype.equals){Object.defineProperty(Number.prototype, "equals", {enumerable: false,value: function(val) { return this.toString().equals('' + val)}});}
if (!Boolean.prototype.equals){Object.defineProperty(Boolean.prototype, "equals", {enumerable: false,value: function(val) { return this.toString().equals('' + val)}});}
if (!Number.prototype.toLowerCase){Object.defineProperty(Number.prototype, "toLowerCase", {enumerable: false,value: function(val) { return this.toString().toLowerCase()}});}
if (!Boolean.prototype.toLowerCase){Object.defineProperty(Boolean.prototype, "toLowerCase", {enumerable: false,value: function(val) { return this.toString().toLowerCase()}});}
if (!String.prototype.hashCode){
  String.prototype.hashCode = function () {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      let character = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + character;
      hash = hash & hash;
    }
    return hash;
  }
}
if (!String.prototype.replaceAll) { String.prototype.replaceAll = function (search, replacement) { var target = this; return target.split(search).join(replacement); }; }
//---- ES6 Number pollyfills
if (!Number.MAX_SAFE_INTEGER) { Number.MAX_SAFE_INTEGER = 9007199254740991; } 
if (Number.isFinite === undefined){Number.isFinite = function (value) {return typeof value === "number" && isFinite(value);};}
Number.isSafeInteger = Number.isSafeInteger || function (value) { return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER; };
Number.isInteger = Number.isInteger || function (value) {return typeof value === "number" && isFinite(value) && Math.floor(value) === value;};

const ProgressORM = require('./ProgressORM'),
      SqlServerORM = require('./SqlServerORM'),
      JsonFileDbORM = require('./JsonFileDbORM');

module.exports = {
    ProgressORM,
    SqlServerORM,
    JsonFileDbORM
}