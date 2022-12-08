module.exports = options => {

    return {
        Descr: {type:"string"},
        IsBin: {type:"boolean"},
        IsInvLocation: {type:"boolean"},
        IsTermLocation: {type:"boolean"},
        LocCode: {type:"string"},
        LocType: {type:"string"},
        ProdTypeList: {type:"string"},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'Location-seq'},
    }

}