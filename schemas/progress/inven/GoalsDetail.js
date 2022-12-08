module.exports = options => {
    return {
        "CurrentCount": "integer",
        "CurrentLabelWgt": "decimal",
        "CurrentNetWgt": "decimal",
        "GoalAcknowledged": "boolean",
        "GoalID": "integer",
        "GoalStatus": "string",
        "ScaleID": "integer",
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'GoalsDetail-seq'},
    }
}