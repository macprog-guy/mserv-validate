'use strict'

var Joi = require('joi'),
	_   = require('lodash')


var language = {

    root: 'value',
    key: '',
    messages: {
        wrapArrays: true
    },
    any: {
        unknown:   'notAllowed',
        invalid:   'invalid',
        empty:     'cannotBeEmpty',
        required:  'required',
        allowOnly: 'notInWhiteList',
        default:   'internalError'
    },
    alternatives: {
        base: 'invalid',
    },
    array: {
        base:                     'notArray',
        includes:                 'containsInvalidValue',
        includesSingle:           'containsInvalidValue',
        includesOne:              'containsInvalidValue',
        includesOneSingle:        'containsInvalidValue',
        includesRequiredUnknowns: 'missingRequiredValue',
        includesRequiredKnowns:   'missingRequiredValue',
        includesRequiredBoth:     'missingRequiredValue',
        excludes:                 'includesBlackListedValues',
        excludesSingle:           'includesBlackListedValues',
        min:                      'minLength',
        max:                      'minLength',
        length:                   'exactLength',
        sparse:                   'containsInvalidValue',
        unique:                   'containsDuplicates'
    },
    boolean: {
        base: 'notBoolean'
    },
    binary: {
        base:   'notBinary',
        min:    'minLenth',
        max:    'maxLength',
        length: 'exactLength'
    },
    date: {
        base:   'notDate',
        min:    'minValue',
        max:    'maxValue',
        isoDate:'wrongFormat',
        ref:    'wrongType'
    },
    function: {
        base: 'notFunction'
    },
    object:{
        base:         'notObject',
        child:        '{{reason}}',
        min:          'minLength',
        max:          'maxLength',
        length:       'exactLength',
        allowUnknown: 'containsInvalidValue',
        with:         'hasMissingPeer',
        without:      'hasConflictWithForbiddenPeer',
        missing:      'hasMissingPeer',
        xor:          'hasConflictWithExclusivePeer',
        or:           'mustContainAtLeastOnePeer',
        and:          'hasMissingPeer',
        nand:         'hasConflictWithExclusivePeer',
        assert:       'internalError',
        rename: {
            multiple: 'internalError',
            override: 'internalError'
        },
        type: 'wrongType'
    },
    number: {
        base:      'notNumber',
        min:       'minValue',
        max:       'maxValue',
        less:      'maxValue',
        greater:   'minValue',
        float:     'notFloat',
        integer:   'notInt',
        negative:  'notNegative',
        positive:  'notPositive',
        precision: 'hasTooManyDecimals',
        ref:       'internalError',
        multiple:  'notMultipleOf'
    },
    string: {
        base:       'notString',
        min:        'minLength',
        max:        'maxLength',
        length:     'exactLength',
        alphanum:   'notAlphaNum',
        token:      'notAToken',
        regex:{
            base:   'doesNotMatch',
            name:   'doesNotMatch'
        },
        email:      'notEmail',
        uri:        'notURI',
        uriCustomScheme: 'notScheme',
        isoDate:    'notIsoDate',
        guid:       'notGUID',
        hex:        'notHex',
        hostname:   'notHostname',
        lowercase:  'notLowercase',
        uppercase:  'notUppercase',
        trim:       'notTrimmed',
        creditCard: 'notCreditCard',
        ref:        'internalError',
        ip:         'notIP',
        ipVersion:  'notIP'
    }
}


function convertJoiErrorsToError(req, joiErr) {

    let err = new Error('validationErrors')

    err.errors = joiErr.details.map(function(details){
        
        let context = details.context,
            key     = details.path,
            value   = context.value || req[key],
            matches = details.message.match(/\w+$/),
            error   = matches? matches[0] : 'unknownError'

        if (error === 'hasMissingPeer') {
            error = 'required'
            key   = context.peers.length == 1? context.peers[0] : 'key'
        }

        return {key, value, error}
    })

    return err
}

function handleError(err) {
    // Default handler just throws the error
    throw err
}



module.exports = function(service, options) {

	let joiOpts  = _.defaults(options.joi || {}, {abortEarly:false, convert:true, language}),
        handler  = options.handler,
        handlers = []

    if (handler && typeof handler === 'function')
        handlers.push(handler)
    else
        handlers.push(handleError)

	return function*(next, options) {

        // Skip middleware if request does not need validation
		if (!options.request)
            return yield next

        // Validate the request input
		let schema = options.request.isJoi? options.request : Joi.object().keys(options.request).options({stripUnknown:true}),
            opts   = _.defaults(options.joi || {}, joiOpts),
            result = Joi.validate(this.req, schema, joiOpts)

        // If everything is valid just set this.req and continue
        if (!result.error) {
            this.req = result.value
            return yield next
        }

        // If there are errors convert to an Error
        let err = convertJoiErrorsToError(this.req, result.error)

        // The handler list is handlers + action
        let handlerList   = handlers,
            actionHandler = options.handler

        if (actionHandler && typeof actionHandler === 'function')
            handlerList = handlerList.concat([actionHandler])

        // List should executed in reverse order
        handlerList = handlerList.reverse()

        // Call the all handlers and bubble the error (or not)
        for (let i in handlerList) {
            let handler = handlerList[i],
                result
            try {
                if (isGeneratorFunction(handler))
                    result = yield* handler.call(this, err)
                else
                    result = handler.call(this, err)

                if (result !== undefined)
                    this.res = result
                
                return
            } 
            catch(newErr) {
                err = newErr
            }
        }

        // If we get here we should re-throw the error so that it gets propagated back
        // to the caller (and perhaps through mserv-except)
        throw err
	}
}



/**

  Extracted directly from the co library.

 */
function isGeneratorFunction(obj) {
  var constructor = obj.constructor;
  if (!constructor) return false;
  if ('GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName) return true;
  return isGenerator(constructor.prototype);
}

function isGenerator(obj) {
  return 'function' == typeof obj.next && 'function' == typeof obj.throw;
}
