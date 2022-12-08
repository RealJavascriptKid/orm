module.exports = options => { 
    return {        
        LocCode: {type:"string"},
        NameValuePairs: {type:"string"},
        StatusCode: {type:"integer"},
        StatusIsSticky: {type:"boolean"},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'LocStatus-seq'},
    }
}