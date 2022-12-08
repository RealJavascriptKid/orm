module.exports = options => {
    return {

        //PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        OrdRefNum: { type: 'integer', preventUpdate: true, requiredOnInsert:true },
        OrdRefLine: { type: 'integer', requiredOnInsert:true },
        //OrdNum: 'string', //Not used in S9 
        ProdCode: 'integer',
        ReqCount: 'integer',
        PickedCount: 'integer',
        LoadedCount: 'integer',
        AllowedAge: 'integer',
        //Notes: 'string',
        AllocationCode: 'string',
        AllowSubstitution: 'boolean',        
        HasSubstitutes: 'boolean',
        SubForRefLine: 'integer',
        SellByDate: 'date',
        AgeDate: 'date',
        Age_Color: 'string',
        StatusCode: 'integer',
        //NameValuePairs: 'string',
        WarehouseCode: 'string',
        BranchCode: 'string',
        PickSequence: 'integer',
        //QRefDate:'date',
        ShippingModeStartDate: 'date',
        ShippingModeEndDate: 'date',
        ShippingBinPickClean: { type: 'boolean', defaultValueOnInsert: false },
        ShippingMode: 'string',
        StoreLoc: 'string', //came from SAP-MIS-OD.StoreLoc field
        //Following are NVP fields from progress
        PalletRequiredCount: 'integer',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true },
    }
}