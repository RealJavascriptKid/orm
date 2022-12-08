module.exports = options => { 
    return {
        CartCount: "integer",
        CustName: "string",
        CustNum: "string",        
        PlantInventory: "boolean",
        RecordSeq: "integer",
        TimeFrame: "datetime",
        Type: "string",
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'CartInventory-seq'},
    }
}