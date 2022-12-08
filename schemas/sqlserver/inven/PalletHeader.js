module.exports = options => {
    return {
        PalletNum: { type: 'string', preventUpdate: true },
        PlantId: { type: 'integer', defaultValueOnInsert: options.plantid, preventUpdate: true },
        LocCode: 'string',
        ItemCount: 'integer',
        SerializedPallet: 'boolean',
        TruckPalLoc: { type: 'integer', defaultValueOnInsert: null },
        AssignedTo: 'string',
        NSPOrderNumber: 'string',
        DateAssigned: 'date',
        AssignedBy: 'string',
        OverrideDate: 'date',
        //Following are NVP Fields                                  
        PalletCounter: { type: 'integer' },
        LoadTemp: 'decimal',
        picktemp: 'decimal',
        UvpPallet: 'boolean',
        SSCC18Barcode: 'string',
        BloxNum: 'string',
        CBloxNum: 'string',
        PalletType: 'string',
        CartInventoryOrdnum: 'string',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true },
    }
}