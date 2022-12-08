module.exports = options => {
    return {

        //PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        OrdRefNum: { type: 'integer', preventInsert: true, preventUpdate: true },
        OrdNum: 'string',
        PONum: 'string',
        RouteNum: 'string',
        //RouteDate
        TruckNum: 'string',
        DockNum: 'string',
        //TruckTrip
        CustNum: 'string',
        ShipToNum: 'string',
        SalesRep: 'string',
        ReqShipDate: 'date',
        ReqShipTime: 'time',
        //ReqShipDateTime: 'datetime', //not in S9 but it should

        // ReqArrDate: 'date', //no longer used in S9
        // ReqArrTime: 'time', //no longer used in S9
        ReqArrDateTime: 'datetime',

        // ConfirmDate: 'date', //no longer used in S9
        // ConfirmTime: 'time', //no longer used in S9
        ConfirmDateTime: 'datetime',
        ConfirmedBy: 'string',

        LoadSeq: 'integer',
        StopSeq: 'integer',
        OrderStatus: 'string',

        ChangeReason: { type:'string',defaultValueOnInsert:'Create',defaultValueOnUpdate:'Update'},
        ChangeOperator: {type:'string'},
        // ChangeDate: 'date',  //replaced by ChangeDT in S9
        // ChangeTime: 'time',  //replaced by ChangeDT in S9        
        ChangeDT: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true },
        CreateDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', preventUpdate: true, preventSelection: true },
        ModifyDateTime: { type: 'datetime', defaultValueOnInsert: 'CURRENT_TIMESTAMP', defaultValueOnUpdate: 'CURRENT_TIMESTAMP', preventSelection: true },
        CompleteDateTime: 'datetime',
        

        // CompletionDate: 'date', // replaced by CompleteDateTime in sqlserver
        // CompletionTime: 'string', // replaced by CompleteDateTime in sqlserver

        OrderType: 'string',
        Misc: 'string',
        SealId: 'string',
        TrailerTemp: 'string',
        TargetTemp: 'decimal',
        //NameValuePairs: 'string',
        LoadNumber: 'string',
        RouteDescription: 'string',
        CarrierCode: 'string',
        SecondaryCarrierCode: 'string',
        ERPPlantID: 'string',
        BOLNumber: 'string',
        PaymentTerms: 'string',
        LoadStopNumber: 'integer',
        //TimeFrame
        TotalTareWeight: 'decimal',
        TotalNetWeight: 'decimal',
        TotalGrossWeight: 'decimal',
        IsOpenOrder: 'boolean',
        //QRefDate

        //Following are NVP fields from progress

        //LoadStarted:'string',

        // DatePickStarted: 'date', //replaced by PickStartDateTime in S9
        // TimePickStarted: 'time', //replaced by PickStartDateTime in S9
        PickStartDateTime: 'datetime',

        DateTimeLoadStarted:'datetime',
        // DateLoadStarted: 'date', //replaced by DateTimeLoadStarted in S9
        // TimeLoadStarted: 'time', //replaced by DateTimeLoadStarted in S9
        LoadStartedBy: 'string',
        PickStartedBy: 'string',
        // LoadDate: 'date', //replaced by LoadDateTime in S9
        // LoadTime: 'time', //replaced by LoadDateTime in S9
        LoadDateTime: 'datetime',
        LoadOperator: 'string',
        TrailerNum: 'string',
        StartingTrailerTemp: 'decimal',
        TrailerSetPointTemp: 'decimal',
        EmptyPalletsOff: 'integer',
        EmptyPalletsOn: 'integer',
        EmptyPalletsOut: 'string',
        TruckWashed: 'boolean',
        TempRecorder: 'string',
        CompleteOperator: 'string',
        // CompleteDate: 'date', // replaced by CompleteDateTime in sqlserver
        // CompleteTime: 'time', // replaced by CompleteDateTime in sqlserver
        ManuallyEnteredOrder: 'boolean',
        ASNPOProdType: 'string',
        PalletTypeChep: 'integer',

    }
}