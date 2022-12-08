module.exports = options => { 
    return {
        CartCount: "integer",
        CustName: "string",
        CustNum: "string",        
        PlantInventory: "boolean",
        RecordSeq: "integer",
        TimeFrame: "datetime",
        Type: "string",
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'CartInventory-seq'},
    }
}