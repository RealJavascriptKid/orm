module.exports = options => {
    return { 
        PalletNum:{type:'string',preventUpdate:true},
        PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        LocCode:'string',
        ItemCount:'integer',
        SerializedPallet:'boolean',
        TruckPalLoc:'string',
        AssignedTo:'string',
        NSPOrderNumber:'string',
        DateAssigned:'date',
        AssignedBy:'string',
        OverrideDate:'date',
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'PalletHeader-seq'},
        _nvp:{                            
            PalletCounter:{type:'integer',nvpname:'counter'},
            LoadTemp:'decimal',
            PickTemp:'decimal',
            UvpPallet:'boolean',
            SSCC18Barcode:'string',
            BloxNum:'string',
            CBloxNum:'string',
            PalletType:'string',
            CartInventoryOrdnum:'string',
        }
    }
}