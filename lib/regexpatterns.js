'use strict';

/**
 * @class
 * @classdesc This is a description of the RegexPatterns constructor function.
 */
class RegexPatterns {
    /**
     * @constructor
     * @param {object} options This list contains names of any additional areas that need to be created on start
     * @description This is the constructor function for this class
     */
    constructor() {
        //
    }

    /**
     *
     * @return {string}
     * <pre>
     * Regex Fragment                 | Meaning
     * ===============================|==============================
     * ^                              | Start of matching
     *  (                          )  | 1st capture group
     *   ?&lt;result&gt;                    | Named capture group
     *            [         ]         | Match characters that are...
     *             A-Z                | ... an uppercase character
     *                a-z             | ... a lowercase character
     *                   0-9          | ... a number
     *                       {1,50}   | one or max 50
     *                              $ | End of line marker
     * </pre>
     */
    getRegexPatternDownloadIdType() {
        return '^(?<result>[A-Za-z0-9]{1,50})$';
    }

    /**
     *
     * @return {string}
     */
    getRegexPatternDownloadIdType2() {
        return />(?<release>[0-9a-zA-Z\\.]+)\s\(L/gm;
    }
}

module.commandName = 'RegexPatterns';
module.exports = RegexPatterns;
module.helpText = 'Common regex patterns used';
