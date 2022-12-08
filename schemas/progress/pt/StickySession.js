module.exports = options => {

    return {
        "SessionID": { type: "integer", preventUpdate: true, requiredOnInsert: true },
        "DataName": { type: "string", requiredOnInsert: true },
        "DataValue": { type: "string" },
        "CreateDateTime": { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        "ModifyDateTime": { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP', preventSelection: true },
    }

}