module.exports = options => {

    //bloxLogTableValidFields
    //I need to stop being lazy and create better schema format like in invenSys base but right now I have too much on my plate
    return ['BloxNum','ProductCode','FromLoc','ToLoc','MoveDate','MoveTime',
    'Operator','ProcessType','BatchID','Step','StationID','Qty','Wgt',
    'ReferenceID','ManuallyModified']

}