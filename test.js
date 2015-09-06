'use strict'

var chai     = require('chai'),
	should   = chai.should(),
	validate = require('.'),
	mserv    = require('mserv'),
	co       = require('co'),
	Joi      = require('joi')

// ----------------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------------

function wrappedTest(generatorFunc) {
	return function(done) {
		try {
			co(generatorFunc)
			.then(
				function()   { done()    },
				function(err){ done(err) }
			)
		}
		catch(err) {
			done(err)
		}
	}
}




describe('mserv-validate', function(){

	let service = mserv({amqp:false}).use('validate',validate),
		array   = []

	service.action({
		name: 'add',
		validate: {
			request: {
				x: Joi.number().required(),
				y: Joi.number().required()
			},
			handler: function*(err) {
				array.push(err)
			}
		},
		handler: function*(){
			return this.req.x + this.req.y
		}
	})

	it('should validate the request and return ok',wrappedTest(function*(){
		let sum = yield service.invoke('add',{x:3, y:4})
		sum.should.equal(7)
	}))

	it('should return validation errors and invoke the action level handler', wrappedTest(function*(){
		let sum = yield service.invoke('add',{x:'a',y:'b'})
		array.should.not.be.empty
		sum.should.eql({
			status:'validationErrors',
			errors:[
				{key:'x', value:'a', error:'notNumber'},
				{key:'y', value:'b', error:'notNumber'}
			]
		})
	}))
})