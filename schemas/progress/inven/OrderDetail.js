module.exports = options => {
    return {

        PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        OrdRefNum:{type:'integer',preventUpdate:true},
        ProdCode:'integer',
        ReqCount:'integer',
        PickedCount:'integer',
        LoadedCount:'integer',
        AllowedAge:'integer',
        Notes:'string',
        AllocationCode:'string',
        AllowSubstitution:'boolean',
        OrdRefLine:'integer',
        OrdNum:'string',
        HasSubstitutes:'boolean',
        SubForRefLine:'integer',
        SellByDate:'date',
        AgeDate:'date',
        Age_Color:'string',
        StatusCode:'integer',
        NameValuePairs:'string',
        WarehouseCode:'string',
        BranchCode:'string',
        PickSequence:'integer',
        QRefDate:'date',
        ShippingModeStartDate:'date',
        ShippingModeEndDate:'date',
        ShippingBinPickClean:'boolean',
        ShippingMode:'string',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'OrderDetail-seq'},
        _nvp:{
            PalletRequiredCount:'integer'
        }
        
    }
}