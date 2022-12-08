module.exports = options => {
    
    return {   
        ProcessName:'string',
        EventCode:'string',
        TransactionID:{ type: 'integer', insertSequence:'EventLogTransactionID', preventUpdate: true },
        LogSequence:{ type: 'integer', insertSequence:'EventLogSequence', preventInsert: true, preventUpdate: true }, //if preventInsert is set then it will use sequence value
        LogDate:{ type: 'date', preventUpdate: true, defaultValueOnInsert: 'SYSTIMESTAMP' },
        LogTime:{ type: 'time', preventUpdate: true, defaultValueOnInsert: 'SYSTIMESTAMP', format:'HH:mm:ss' },        
        ProgramName:'string',
        FunctionName:'string',
        Operator:'string',
        MessageText:'string',
        SerialNum:'string',
        PalletNum:'string',
        OrdNum:'string',
        OrdRefLine:'integer',
        ProdCode:'integer',
        CustNum:'string',
        FileName:'string',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'EventLog-seq'},
    }
}