'use strict'

import {expect} from 'chai'
import mysql from 'mysql'
import wrap from './mysql'
import Shimmer from '../shimmer'
import TrailClient from '../client'
import consts from '../consts'

describe('mysql e2e', () => {
    let client = new TrailClient()
    const DB = {
        host: '127.0.0.1',
        port: 3306,
        database: 'trail_test',
        user: 'root',
    }
    let records

    beforeEach(() => {
        records = []
        client.setRecorder((span) => {
            records.push(span)
        })
        wrap(mysql, client)
    })

    afterEach(() => {
        Shimmer.unwrapAll()
    })

    it('should record Connection.query', (done) => {
        let connection = mysql.createConnection(DB)
        connection.connect()
        let queryStr1 = 'select * from user'
        let queryStr2 = 'select * from not_exist_table'
        connection.query(queryStr1, (err1) => {
            expect(err1).to.not.exist
            connection.query(queryStr2, (err2) => {
                expect(err2).to.exist
                let [span1, span2] = records
                expect(span1.operationName).to.eql(queryStr1)
                expect(span1.tags.database).to.eql(DB.database)
                expect(span1.tags.status).to.eql(consts.EDGE_STATUS.OK)
                expect(span2.operationName).to.eql(queryStr2)
                expect(span2.tags.status).to.eql(consts.EDGE_STATUS.NOT_OK)
                done()
            })
        })
    })

    it('should record Pool.query', (done) => {
        let pool = mysql.createPool(DB)
        let queryStr = 'select * from user'
        pool.query(queryStr, (err) => {
            expect(err).to.not.exist
            let [span] = records
            expect(span.operationName).to.eql(queryStr)
            expect(span.tags.status).to.eql(consts.EDGE_STATUS.OK)
            done()
        })
    })
})
