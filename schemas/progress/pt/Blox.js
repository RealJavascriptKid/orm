module.exports = options => {

    //I need to stop being lazy and create better schema format like in invenSys base but right now I have too much on my plate
    return ['BloxNum','ProductCode','Quantity','LocCode','NetWgt','Lot',
    'MfgDate','UseByDate','Depleted','PdnLot','PdnMfgDate','PdnNetWgt','PdnQuantity',
    'PdnUseByDate','PdnLocCode','StationID','PdnStationID','PdnProcessType','UOMtoLbFactor',
    'UOM','Tare','ContainerType','ContainerID','AgeDate','ProductType','TimeCreated','DateCreated',
    'CostPerUnit','Ancestor','InUse','ShortBloxNum','CombinedBloxID']

}