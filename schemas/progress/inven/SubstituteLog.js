module.exports = options => {
    
    return {
       
        Date:{type:'date',defaultValueOnInsert: 'SYSTIMESTAMP'},  
        TimeOfSub:{type:'string',defaultValueOnInsert: 'SYSTIMESTAMP',format:'HH:mm'},    
        Operator:'string',
        SubRefLine:'integer',
        SubProdCode:'integer',
        SubQuantity:'integer',
        OrigRefLine:'integer',
        OrigProdCode:'integer',
        OrdRefNum:'integer',
        OrdNum:'string',
        SequenceID: { type: 'integer', insertSequence:'SubSequence', preventUpdate: true, preventInsert: true }, //because it is sequence so need to calculate it first
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'SubstituteLog-seq'},
    }
}