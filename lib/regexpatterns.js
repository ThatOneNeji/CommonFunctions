'use strict';

/**
 * @class
 * @classdesc Commonly used regex patterns. Most are static getters returning a pattern string for use with <code>new RegExp()</code>.
 */
class RegexPatterns {
    /**
     * @constructor
     * @description This is the constructor function for this class
     */
    constructor() {
        //
    }

    /**
     *
     * @return {string[]} Names of every static pattern getter on this class
     * @description Useful for iterating over all patterns
     * @static
     */
    static get patternNames() {
        return [
            'RegexPatternValidIPV4Netmask',
            'RegexPatternValidIPV4Address',
            'RegexPatternValidHostname',
            'RegexPatternRawDate',
            'RegexPattenRawTime',
            'RegexPatternRoundDownTimer',
            'RegexPatternRoundUpTimer',
            'RegexPatternLinuxPingPacket',
            'RegexPatternLinuxStatsRegex',
            'RegexPatternWIN32PacketRegex',
            'RegexPatternWIN32StatsRegex'
        ];
    }

    /**
     *
     * @return {string}
     * @description Validation regex pattern for IPv4 netmasks
     * @static
     */
    static get RegexPatternValidIPV4Netmask() {
        return '^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\/(2[4-9])$';
    }

    /**
     *
     * @return {string}
     * @description Validation regex pattern for IPv4 addresses
     * @static
     */
    static get RegexPatternValidIPV4Address() {
        return '^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$';
    }

    /**
     *
     * @return {string}
     * @description Validation regex pattern for host names
     * @static
     */
    static get RegexPatternValidHostname() {
        return '^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\\.?$';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for yyyymmdd dates
     * @static
     */
    static get RegexPatternRawDate() {
        return '(\\d{4})(\\d{2})(\\d{2})';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for hhmmss times
     * @static
     */
    static get RegexPattenRawTime() {
        return '(?!^)(?=(?:\\d{2})+(?:\\.|$))';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for rounding down time
     * @static
     */
    static get RegexPatternRoundDownTimer() {
        return '(\\d{3})([0-4]{1})(\\d{2})';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for rounding up time
     * @static
     */
    static get RegexPatternRoundUpTimer() {
        return '(\\d{3})([5-9]{1})(\\d{2})';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for Linux ping packets
     * <pre>
     * Regex Fragment                                                    | Meaning
     * ==================================================================|============================
     * (             )                                                   | 1st capture group
     *  ?&lt;sent&gt;                                                          | Named capture group
     *         [   ]                                                     | Match characters that are...
     *          0-9                                                      | ... a number
     *              +                                                    | one or more
     *                 packets transmitted,                              | Text anchor
     *                                      (                 )          | 2st capture group
     *                                       ?&lt;received&gt;                 | Named capture group
     *                                                  [   ]            | Match characters that are...
     *                                                   0-9             | ... a number
     *                                                       +           | one or more
     *                                                          received | Text anchor
     * </pre>
     * @static
     */
    static get RegexPatternLinuxPingPacket() {
        return '(?<sent>[0-9]+) packets transmitted, (?<received>[0-9]+) received';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for Linux ping stats
     * <pre>
     * Regex Fragment                                                                      | Meaning
     * ====================================================================================|============================
     * min/avg/max/mdev =                                                                  | Text anchor
     *                    (             )                                                  | 1st capture group
     *                     ?&lt;min&gt;                                                          | Named capture group
     *                           [    ]                                                    | Match characters that are...
     *                            0-9                                                      | ... a number
     *                               .                                                     | ... a special character
     *                                 +                                                   | one or more
     *                                   /                                                 | Text anchor
     *                                    (             )                                  | 2nd capture group
     *                                     ?&lt;avg&gt;                                          | Named capture group
     *                                           [    ]                                    | Match characters that are...
     *                                            0-9                                      | ... a number
     *                                               .                                     | ... a special character
     *                                                 +                                   | one or more
     *                                                   /                                 | Text anchor
     *                                                    (             )                  | 3rd capture group
     *                                                     ?&lt;max&gt;                          | Named capture group
     *                                                           [    ]                    | Match characters that are...
     *                                                            0-9                      | ... a number
     *                                                               .                     | ... a special character
     *                                                                 +                   | one or more
     *                                                                   /                 | Text anchor
     *                                                                    (              ) | 4th capture group
     *                                                                     ?&lt;mdev&gt;         | Named capture group
     *                                                                            [    ]   | Match characters that are...
     *                                                                             0-9     | ... a number
     *                                                                                .    | ... a special character
     *                                                                                  +  | one or more
     *</pre>
     * @static
     */
    static get RegexPatternLinuxStatsRegex() {
        return 'min\\/avg\\/max\\/mdev = (?<min>[0-9.]+)\\/(?<avg>[0-9.]+)\\/(?<max>[0-9.]+)\\/(?<mdev>[0-9.]+)';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for WIN32 ping packets
     * @static
     */
    static get RegexPatternWIN32PacketRegex() {
        return 'Packets: Sent = (?<sent>[0-9]+), Received = (?<received>[0-9]+), Lost = (?<lost>[0-9]+)';
    }

    /**
     *
     * @return {string}
     * @description Regex pattern extraction for WIN32 ping stats
     * @static
     */
    static get RegexPatternWIN32StatsRegex() {
        return 'Minimum = (?<min>[0-9]+)ms, Maximum = (?<max>[0-9]+)ms, Average = (?<avg>[0-9]+)ms';
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
     * @return {RegExp} Global regex with a named "release" group, e.g. matches "1.2.3" in ">1.2.3 (Latest"
     */
    getRegexPatternDownloadIdType2() {
        return />(?<release>[0-9a-zA-Z\\.]+)\s\(L/gm;
    }
}

module.commandName = 'RegexPatterns';
module.exports = RegexPatterns;
module.helpText = 'Common regex patterns used';
