# Introduction
mserv-validate is [mserv](https://github.com/macprog-guy/mserv) middleware to provide input validation and cleansing services to the message pipeline. It uses [Joi](https://github.com/hapijs/joi) to perform the actual validation.

# Installation

	$ npm i --save mserv-validate

# Usage

```js

var validate = require('mserv-validate'),
	service  = require('mserv')(),

service.use('validate', validate)

service.action({
	name: 'login',
	validate:  {
		request: {
			email: Joi.string().email().trim().required(),
			password: Joi.string().required()
		}
	},
	handler: function*() {
		// Here we are know that email and password are valid.
	}
})

```

# Validation

Actions should specify a `validate` key whose value is a Joi model or a plain object whose keys are Joi models. The latter will be converted to a using:

 `Joi.object().keys( actionKeys ).options({stripUnknown:true})`. 

 This has the effect of removing unknown keys and casting them to the expected type. The context request is set to output of the Joi.validate function.  

 `this.req = Joi.validate(...).value`.

By default, global options set the following Joi options:

- `abortEarly:false` 
- `convert:true`


# Custom Error Handling

The default error handler converts Joi errors into a {status, errors:[{key,value,error}]}.
If another response format is preferable then simply provide an error handler.

```js

service.use('validate',validate,{
	handler: function*(error) {
		this.res = 'BOOM!'
	}
})

```

# Action Level Error Handling

Actions can also define an error handler, which would get executed before the global handler.

```js

service.action({
	name: 'login',
	validate:  {
		request: {
			email: Joi.string().email().trim().required(),
			password: Joi.string().required()
		},
		handler: function*(err){
			console.log(err)
		}
	},
	handler: function*() {
		// Here we are know that email and password are valid.
	}
})

```

