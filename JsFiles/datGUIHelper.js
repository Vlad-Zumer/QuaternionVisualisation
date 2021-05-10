/*
Given a JS Object Create a datGUI GUI that represents it.

Also provides a OnChanged(path,value) that fires when the GUI changes
    where path is the path to the control/json value that was changed
    and value is the new value

Also allows to get controls for a given path

JSON eg.
{
    'Folder 1': {
        'Number Value 1': {
            val: 1.0,
            max: 5.0,
            min: 0.0,
            inc: 0.01,
        },
        'Bool': false,
    },
    'Folder 2': {
        'Number Value 2': 0.0,
        'Function': function () { console.log('hello world') },
        'Subfolder 1': {
            'Number Value 2': {
                val: 0.0,
                max: 5,
                min: -2.5,
            }
        },
        'String' : 'Hello',
        'Options' : {
            val: 'Op1',
            options: ['Op1','Op2','Op3'],
        }
    }
}

*/

export class GUIManager {

    static ControlType = {
        ANY_CONTROL: 'ANY_CONTROL',
        FOLDER_CONTROL: 'FOLDER_CONTROL',
        VALUE_CONTROL: 'VALUE_CONTROL',
    }

    /**
     * 
     * @param {object} datGUI - datGUI GUI object 
     */
    constructor(datGUI) {
        this.GUI = datGUI;
        this.__onChange = undefined;
    }

    /**
     * 
     * @param {Object} GUIRepresentationObj - Representation of the GUI
     * @param {string} basePath - the beginning of the path, default = '/' 
     * @returns 
     */
    makeGUI(GUIRepresentationObj, basePath = "/") {

        if (GUIRepresentationObj === undefined || GUIRepresentationObj === null || typeof (GUIRepresentationObj) !== 'object') {
            throw `Argument is not an object`;
        }

        if (Object.keys(GUIRepresentationObj).length === 0 && GUIRepresentationObj.constructor === Object) {
            throw 'Empty object';
        }

        if (basePath === "") {
            basePath = "/";
        }

        this.GUIControlFullData = _recursiveMakeGUI(this, this.GUI, GUIRepresentationObj, basePath);
        this.pathControlMap = this.GUIControlFullData['path'];
        this.dataObject = this.GUIControlFullData['obj'];

        return this.dataObject
    }

    /**
     * returns the controller associated with the path
     * @param {string} path - path to the control, accepts wildcard (*)
     * @param {string} controlType - the control type to get from the path
     * @returns {Object} on object of the form { 'VALUE_CONTROLS':[], 'FOLDER_CONTROLS':[] }
     */
    getControls(path, controlType) {
        let splitPath = path.split('/');

        if (splitPath[0] === "") {
            // remove first entry as it is empty
            splitPath.shift();
        }

        // reconstruct path as a regex
        let wildCards = ['*'];
        let isWildcard = (val) => wildCards.includes(val);
        let isPathFolder = (path) => path.endsWith('/');
        let regexPath = "^";
        let indx = 0;
        while (indx < splitPath.length) {
            if (!isWildcard(splitPath[indx])) {
                regexPath += "\\/" + splitPath[indx];
            }
            else {
                regexPath += "\\/(.*)";
            }

            indx++;
        }
        regexPath += "$";
        let regex = new RegExp(regexPath);

        let desiredPaths = Object.keys(this.pathControlMap).filter((key) => { return regex.test(key); }).filter((key) => {
            switch (controlType) {
                case GUIManager.ControlType.VALUE_CONTROL:
                    return !isPathFolder(key);
                    break;
                case GUIManager.ControlType.FOLDER_CONTROL:
                    return isPathFolder(key);
                    break;
                case GUIManager.ControlType.ANY_CONTROL:
                    return true;
                    break;
                default:
                    throw 'Invalid control type, please use GUIManager.ControlType properties for valid control types'.
                        break;
            }
        });

        let controls = desiredPaths.map((val) => { return this.pathControlMap[val]; });

        return controls;
    }

    /**
     * When called updates all visuals of the GUI
     */
    updateVisuals() {
        Object.keys(this.pathControlMap).forEach((key) => {
            if (!key.endsWith('/')) {
                this.pathControlMap[key].updateDisplay();
            }
        });
    }

    /**
     * 
     * @param {Function} fnc -> function to be called when a change happens 
     */
    onChange(fnc) {
        this.__onChange = fnc;
    }
}

export class GUIObjHelpers {
    static CreateNumberSlider(val, min, max, inc) {
        return {
            val: val,
            min: min,
            max: max,
            inc: inc,
        };

    }
    static CreateOptions(defaultVal, options) {
        return {
            val: defaultVal,
            options: options
        };
    }
}

///////////////////////////
// CLASS PRIVATE FUNCTIONS
//////////////////////////

function _onChange(object, path, value) {
    if (object.__onChange) {
        object.__onChange.call(object, path, value);
    }
}

function _isNumberDefinition(obj) {

    if (obj === undefined || obj === null || typeof (obj) !== 'object') {
        throw `Argument is not an object`;
    }

    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
        throw 'Empty object';
    }

    // NumberControlDefinition keys
    let possibleKeys = ['val', 'max', 'min', 'inc'];
    let objKeys = Object.keys(obj);

    // must contain val
    if (!objKeys.includes('val')) {
        return false;
    }

    // check if all keys in the object are part of the NumberControlDefinition keys
    let allKeysOk = objKeys.map(key => possibleKeys.includes(key)).reduce((acc, val) => acc && val);

    // check if all values for all the keys are numbers
    let allValuesOk = Object.values(obj).map((val) => Number.isFinite(val)).reduce((acc, val) => acc && val);

    return allKeysOk && allValuesOk;
}

function _isOptionDefinition(obj) {

    if (obj === undefined || obj === null || typeof (obj) !== 'object') {
        throw `Argument is not an object`;
    }

    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
        throw 'Empty object';
    }

    let objKeys = Object.keys(obj);

    // must contain val
    if (!objKeys.includes('val')) {
        return false;
    }

    if (!objKeys.includes('options')) {
        return false;
    }

    // make sure options is Array
    if (!Array.isArray(obj['options'])) {
        return false;
    }

    return true;

}


function _recursiveMakeGUI(me, GUI, controlToAdd, path, settingsObj = {}) {

    let endPointPath = path.slice(0, -1); // remove last '/'
    let controlName = endPointPath.slice(endPointPath.lastIndexOf('/') + 1);

    // check if controlToAdd is object
    if (controlToAdd !== undefined && controlToAdd !== null && typeof (controlToAdd) === 'object') {

        // check if controlToAdd is number repr object
        if (_isNumberDefinition(controlToAdd)) {
            // add control, make path and return
            settingsObj[controlName] = controlToAdd['val'];
            let control = GUI.add(settingsObj, controlName, controlToAdd.min, controlToAdd.max, controlToAdd.inc).onChange((val) => { _onChange(me, endPointPath, val); });
            let retObj = { 'path': {}, 'obj': {} };
            retObj['path'][endPointPath] = control;
            retObj['obj'] = settingsObj;
            return retObj;
        }

        // check if controlToAdd is option repr object
        if (_isOptionDefinition(controlToAdd)) {
            // add control, make path and return
            settingsObj[controlName] = controlToAdd['val'];
            let control = GUI.add(settingsObj, controlName).options(controlToAdd.options).onChange((val) => { _onChange(me, endPointPath, val); });
            let retObj = { 'path': {}, 'obj': {} };
            retObj['path'][endPointPath] = control;
            retObj['obj'] = settingsObj;
            return retObj;
        }

        // this is a folder
        // add control, recurse

        let isRoot = path == "/";

        // if is Root do not add folder
        let folderControl = isRoot ? GUI : GUI.addFolder(controlName);
        let retObj = { 'path': {}, 'obj': {} };

        if (!isRoot) {
            retObj['obj'][controlName] = {};
        }

        retObj['path'][path] = folderControl;

        let subControlsNames = Object.keys(controlToAdd);
        let subControls = subControlsNames.map((subControlsName) => {
            let controlPath = path + subControlsName + "/";
            let controlObj = controlToAdd[subControlsName];

            let recRes = {};
            if (isRoot) {
                recRes = _recursiveMakeGUI(me, folderControl, controlObj, controlPath, retObj['obj']);
                retObj['obj'][subControlsName] = recRes['obj'][subControlsName];
            } else {
                recRes = _recursiveMakeGUI(me, folderControl, controlObj, controlPath, retObj['obj'][controlName]);
                retObj['obj'][controlName][subControlsName] = recRes['obj'][subControlsName];
            }

            Object.keys(recRes['path']).forEach((key) => {
                retObj['path'][key] = recRes['path'][key];
            });

        });

        return retObj;
    }

    // normal control

    settingsObj[controlName] = controlToAdd;
    let control;

    // do not add 'OnChanged' for functions -> Does it make sense?
    let isFunction = typeof (controlToAdd) == 'function';
    if (isFunction) {
        control = GUI.add(settingsObj, controlName);
    }
    else {
        control = GUI.add(settingsObj, controlName).onChange((val) => { _onChange(me, endPointPath, val); });
    }

    let retObj = { 'path': {}, 'obj': {} };
    retObj['path'][endPointPath] = control;
    retObj['obj'] = settingsObj;
    return retObj;

}