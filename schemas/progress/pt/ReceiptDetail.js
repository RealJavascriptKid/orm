module.exports = options => {

    return {

        BloxNum:'string',
        ContainerTare:'string',
        ContainerType:'string',        
        LabelWgt:{type:'decimal',alternatives:['LabelWeight']},
        Lot:'string',
        ManLineNum:'integer',
        MfgDate:'date',
        UseByDate:'date',
        OrigBarCodeScan:'string',
        PercentWaterLoss:'decimal',
        ProdType:'string',
        ProductCode:'string',
        Quantity:'decimal',
        RecDate:'date',
        RecDT:'datetime',
        ReceiptID:'integer',
        ReceivedBy:'string',        
        RecTime:'string',
        SerialNum:'string',
        Temperature:'decimal',
        UPC:'string',       
        VendorLot:'string',
        VendorWgt:'decimal',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP',  preventSelection: true },
    }

}