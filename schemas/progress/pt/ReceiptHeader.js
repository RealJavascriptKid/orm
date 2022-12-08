module.exports = options => {

    return {
        ManLineNum:'integer',
        Quantity:'decimal',
        PalletNum:'string',
        BloxNum:'string',
        TargetSystem:'string',
        ReceiptID:'integer',
        IsSerialized:'boolean',
        WasNotOnASN:'boolean',
        PalletNumScanned:'string',
        BloxNumScanned:'string',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP',  preventSelection: true },
    }

}