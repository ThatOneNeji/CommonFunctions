'use strict';
/**
 * @file
 * @author ThatOneNeji
 * @version 1.6.1
 * @overview
 * <p>This group of classes provide functionality that is reused across the various netstats applications.</p><br>
 * <hr style="margin-top: 1px; margin-bottom: 1px;">
 * <h2 style="margin-top: 2px;">Installation</h2>
 * <p>Running the following command will install the classes into your project</p>
 * <pre>npm i git+ssh://git@github.com:ThatOneNeji/CommonFunctions.git --save</pre><br>
 * <hr style="margin-top: 1px; margin-bottom: 1px;">
 * <h2 style="margin-top: 2px;">Using</h2>
 * <h4>Logger</h4>
 * <p>The <i>Logger</i> class is used for logging.</p>
 * <h6>Declaring and Using</h6>
 * <pre>const Logger = require('commonfunctions').Logger;
 * const Logging = new Logger();</pre><br>
 * <h4>MessageBroker</h4>
 * <p>The <i>MessageBroker</i> class handles the incoming and outgoing messages.</p>
 * <h6>Declaring and Using</h6>
 * <pre>const Messagebroker = require('commonfunctions').MessageBroker;
 * const MessageBroker = new Messagebroker();</pre><br>
 * <h4>NejiUtils</h4>
 * <p>The <i>NejiUtils</i> class contains commonly used functions.</p>
 * <h6>Declaring and Using</h6>
 * <pre>const Nejiutils = require('commonfunctions').NejiUtils;
 * const NejiUtils = new Nejiutils();</pre><br>
 */


const Logger = require('./lib/logger.js');
const MessageBroker = require('./lib/messagebroker.js');
const NejiUtils = require('./lib/nejiutils.js');

module.exports = {
    Logger: Logger,
    MessageBroker: MessageBroker,
    NejiUtils: NejiUtils
};