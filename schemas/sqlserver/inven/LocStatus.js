module.exports = options => { 
    //return ['LocCode', 'StatusCode', 'StatusIsSticky']

    return {
        ChangeDT:{ type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP',  preventSelection: true },
        ChangeOperator:{type:"string"},
        ChangeReason: { type: "string", defaultValueOnInsert:'Create', defaultValueOnUpdate:'Update' },
        Location_ID:{type:"integer"},
        NameValuePairs:{type:"string"},
        RecordSeq:{type:"integer"},
        StatusCode_ID:{type:"integer"},
        StatusIsSticky:{type:"boolean"},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'CrossRef-seq'},
    }
}