// Node 20 (bundled with nw.js 0.77.0) no longer converts data that is not a string or a Buffer to a
// string when writing files; it throws ERR_INVALID_ARG_TYPE instead. OMORI relies on the old behaviour:
// saving writes numbers with fs.writeFile (issue #1), and the title screen state after an ending is
// written with fs.writeFileSync(path, 447) (issue #5). fs.appendFile and fs.appendFileSync go through
// these two, so they are covered as well.
// Strings, Buffers, typed arrays and DataViews pass through unchanged; anything else is converted with
// String(), as the Node version of the original nw.js did.
function patch()
{
    let fs = require("fs");

    function coerce(data)
    {
        if(typeof(data) === "string" || ArrayBuffer.isView(data))
            return data;
        return String(data);
    }

    let oldWriteFile = fs.writeFile;
    fs.writeFile = function (path, data, options, callback)
    {
        return oldWriteFile.call(this, path, coerce(data), options, callback);
    }

    let oldWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = function (path, data, options)
    {
        return oldWriteFileSync.call(this, path, coerce(data), options);
    }
}

if(!module.exports.patched)
{
    patch();
    module.exports.patched = true;
}
