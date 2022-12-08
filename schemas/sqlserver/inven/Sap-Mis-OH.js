module.exports = options => {
    return {

        OrdNum: 'string',
        Moved_To_Orderh: 'boolean',
        CustNum: 'string',
        SalesRep: 'string',
        Case_Count: 'integer',
        ChangeDate: 'date',
        ChangeTime: 'time',
        Modular_Flag: 'string',
        Modular_Pallet: 'string',
        //PlantId:{type:'integer',defaultValueOnInsert:options.plantid,preventUpdate:true},
        NameValuePairs: 'string',
        LoadNumber: 'string',
        RouteDescription: 'string',
        SecondaryCarrierCode: 'string',
        ERPPlantID: 'string',
        BOLNumber: 'string',
        PaymentTerms: 'string',
        RouteNum: 'string',
        CarrierCode: 'string',
        LoadStopNumber: 'integer'

    }
}