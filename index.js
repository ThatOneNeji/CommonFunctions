'use strict';
/**
 * @file
 * @author ThatOneNeji
 * @version 1.5.0
 * @overview
 * <p>This application is used to connect to the targeted SFTP server, get a list of files, download them, apply the ETL process, and then keep a list of files that have already been processed. It can also load files from a local directory.</p><br>
 * <h3>Process Flow</h3>
 * <p>[Scan target SFTP server] -> [See which files have not been downloaded as yet, and download them] -> [Parse the files] -> [Load the data into MySQL database]</p><br>
 * <h3>Installation</h3>
 * <p>Running the following command will download the required 3rd part libraries as well as create documentation regarding the main JS file under "documentation"</p>
 * <pre>npm install</pre><br>
 * <h4>Running</h4>
 * <pre>node mnpsftpclient.js</pre><br>
 * <h3>Notes</h3>
 * <h4>Default database table structure</h4>
 * <pre>
 * CREATE TABLE `msisdn`
(
   `firstseen`      timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'This field indicated when the MSISDN was first loaded',
   `msisdn`         varchar(20) NOT NULL COMMENT 'The Mobile Station International Subscriber Directory Number',
   `np`             varchar(20) DEFAULT NULL COMMENT '???',
   `lastupdated`    timestamp
                    NOT NULL COMMENT 'The last this changes were made to this row'
                    DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
   `source`         varchar(64) NOT NULL COMMENT '???',
   `IDNumber`       varchar(64) DEFAULT NULL COMMENT '???',
   `RNORoute`       varchar(20) DEFAULT NULL COMMENT '???',
   `Action`         varchar(20) DEFAULT NULL COMMENT '???',
   PRIMARY KEY(`msisdn`)
)
ENGINE = InnoDB
DEFAULT CHARSET = utf8;</pre>
 * <h3>Troubleshooting</h3>
 * <p>Issue 1</p>
 * <p>Issue 2</p><br>
 */

const Logger = require('./lib/logger.js');
module.exports = Logger;

const MessageBroker = require('./lib/messagebroker.js');
module.exports = MessageBroker;

const NejiUtils = require('./lib/nejiutils.js');
module.exports = NejiUtils;