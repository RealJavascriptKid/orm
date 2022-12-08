module.exports = options => {
    
    return {
       
        Date:{type:'date',defaultValueOnInsert:'CURRENT_TIMESTAMP'},  
        TimeOfSub:{type:'string',defaultValueOnInsert:'CURRENT_TIMESTAMP', format:'HH:mm'},    
        Operator:'string',
        SubRefLine:'integer',
        SubProdCode:'integer',
        SubQuantity:'integer',
        OrigRefLine:'integer',
        OrigProdCode:'integer',
        OrdRefNum:'integer',
        OrdNum:'string',
        SequenceID: { type: 'integer', preventUpdate: true, preventInsert: true }, //because it is identity field
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
    }
}