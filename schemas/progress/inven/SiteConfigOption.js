module.exports = options => { 
    return {
        OptionDescr: {type:"string"},
        OptionName: {type:"string"},
        OptionValue: {type:"string"},
        PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'SiteConfigOption-seq'},
    }
}