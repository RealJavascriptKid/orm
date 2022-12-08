module.exports = options => {
    return { 
        OrdRefNum:'integer',
        OrdNum:'string',
        OrdRefLine:'integer',
        NotesID:'integer',
        NotesText:'string',
        NameValuePairs:'string',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'OrderNotes-seq'},
        //QRefDate
    }
}