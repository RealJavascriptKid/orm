module.exports = options => {    
    return {   
        ProcessName:'string',
        EventCode:'string',
        TransactionID:{ type: 'integer', preventUpdate: true },
        LogSequence:{ type: 'integer', preventUpdate: true },
        LogDate:{ type: 'date', preventUpdate: true, defaultValueOnInsert: 'CURRENT_TIMESTAMP' },
        LogTime:{ type: 'time', preventUpdate: true, defaultValueOnInsert: 'CURRENT_TIMESTAMP', format:'HH:mm:ss' },       
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
        //TimeFrame
        CreateDateTime: { type: 'datetime', preventUpdate: true, preventSelection: true, defaultValueOnInsert: 'CURRENT_TIMESTAMP' }, //we don't want to update the value of this field when updating nor want to be selected
        ModifyDateTime: { type: 'datetime', preventSelection: true, defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP' },
        //RecordSeq
    }
}