'use strict'

var chai     = require('chai'),
	should   = chai.should(),
	validate = require('.'),
	mserv    = require('mserv'),
	co       = require('co'),
	Joi      = require('joi'),
	_        = require('lodash')

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
				array.push({name:err.name, message:err.message, errors:err.errors})
				throw err
			}
		},
		handler: function*(){
			return this.req.x + this.req.y
		}
	})

	beforeEach(function(done){
		array = []
		done()
	})


	it('should validate the request and return ok',wrappedTest(function*(){
		let sum = yield service.invoke('add',{x:3, y:4})
		sum.should.equal(7)
	}))

	it('should throw a validationErrors and invoke the action level handler', wrappedTest(function*(){
		try {
			yield service.invoke('add',{x:'a',y:'b'})
			throw new Error('Invoke did not throw')
		}
		catch(err) {
			if (err.message === 'Invoke did not throw')
				throw err

			err = _.pick(err, 'name','message','errors')
			err.should.eql({
				name:'Error', 
				message:'validationErrors', 
				errors:[
					{key:'x', value:'a', error:'notNumber'},
					{key:'y', value:'b', error:'notNumber'}
				]
			})
		}
	}))
})