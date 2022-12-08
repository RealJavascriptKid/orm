module.exports = options => {
    return { 
                            
        PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        OrdRefNum:{type:'integer',preventUpdate:true},
        OrdNum:'string',
        PONum:'string',
        RouteNum:'string',
        //RouteDate
        TruckNum:'string',
        DockNum:'string',
        //TruckTrip
        CustNum:'string',
        ShipToNum:'string',
        SalesRep:'string',
        ReqShipDate:'date',
        ReqShipTime:{type:'time',format:'HHmm'},
        ReqShipDateTime:'datetime',

        ReqArrDate:'date',
        ReqArrTime:{type:'time',format:'HHmm'},
        ReqArrDateTime:'datetime',
        
        ConfirmDate:'date',
        ConfirmTime:{type:'time',format:'HHmm'},
        ConfirmDateTime:'datetime',
        ConfirmedBy:'string',

        LoadSeq:'integer',
        StopSeq:'integer',
        OrderStatus:'string',
        ChangeDate:'date',
        ChangeTime:{type:'time',format:'HHmm'},
        CompletionDate:'date',
        CompletionTime:'string',
        OrderType:'string',
        Misc:'string',
        SealId:'string',
        TrailerTemp:'decimal',
        TargetTemp:'decimal',
        NameValuePairs:'string',
        LoadNumber:'string',
        RouteDescription:'string',
        CarrierCode:'string',
        SecondaryCarrierCode:'string',
        ERPPlantID:'string',
        BOLNumber:'string',
        PaymentTerms:'string',
        LoadStopNumber:'integer',
        //TimeFrame
        TotalTareWeight:'decimal',
        TotalNetWeight:'decimal',
        TotalGrossWeight:'decimal',
        IsOpenOrder:'boolean',
        //QRefDate
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'SYSTIMESTAMP', defaultValueOnUpdate: 'SYSTIMESTAMP',  preventSelection: true },
        //RecordSeq:{type:'integer',insertSequence:'OrderHeader-seq'},
        
        _nvp:{
            //LoadStarted:'string',
            DatePickStarted:'date',
            TimePickStarted:'time',
            DateLoadStarted:'date',
            TimeLoadStarted:'time',
            LoadStartedBy:'string',
            PickStartedBy:'string',
            LoadDate:'date',
            LoadTime:'time',
            LoadOperator:'string',
            TrailerNum:'string',
            StartingTrailerTemp:'decimal',
            TrailerSetPointTemp:'decimal',
            EmptyPalletsOff:'integer',
            EmptyPalletsOn:'integer',
            TruckWashed:'boolean',
            TempRecorder:'string',
            CompleteOperator:'string',
            CompleteDate:'date',
            CompleteTime:'time',
            ManuallyEnteredOrder:'boolean',
            ASNPOProdType:'string',
            PalletTypeChep :'integer',
            SSCC18Barcode:'string'
        }


    }
}