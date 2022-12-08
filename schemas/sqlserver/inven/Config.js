module.exports = options => { 
    return {
        OptionDescr: {type:"string"},
        OptionName: {type:"string"},
        OptionValue: {type:"string"},
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'SiteConfigOption-seq'},
    }
}