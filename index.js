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


function* handleError(error) {

    // Convect Joi errors to our {key, value, error} structure and return early
    let self   = this,
        errors = error.details.map(function(details){
        
        let context = details.context,
            key     = details.path,
            value   = context.value || self.req[key],
            matches = details.message.match(/\w+$/),
            error   = matches? matches[0] : 'unknownError'

        return {key, value, error}
    })

    // Set the response and DON'T yield next
    this.res = {status:'validationErrors', errors}
}



module.exports = function(service, options) {

	let globalOptions = _.defaultsDeep(options || {}, {abortEarly:false, convert:true, language})
    let handler = globalOptions.handler || handleError
    delete globalOptions.handler

	return function*(next, options) {

		if (options.request) {

			let joiSchema = options.request.isJoi? options.request : Joi.object().keys(options.request).options({stripUnknown:true}),
                joiOpts   = _.omit(_.defaultsDeep(globalOptions, options),'request','action','handler'),
                joiValue  = this.req

            let result = Joi.validate(joiValue, joiSchema, joiOpts)

            if (result.error) {
                if (options.handler && typeof options.handler === 'function')
                    yield options.handler.call(this, result.error)
                yield handler.call(this, result.error)
                return
            }
            else
                this.req = result.value
		}
		return yield next
	}
}
