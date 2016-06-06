var STRIPE_PK = 'pk_test_zZldjt2HNSnXVxLsv3XSjeI3'

function isValidPayMethod (str) {
  if (str == 'stripe') return true
  if (str == 'paypal') return true
  return false
}

function buyLicense (e, el) {
  var data = getTargetDataSet(el)
  if (!data.vendor) return
  if (!data.identity) return
  if (!isValidPayMethod(data.method)) return
  buyLicense[data.method](data)
}

buyLicense.paypal = function buyLicensePayPal (data) {
  console.warn('not implemented')
}

buyLicense.stripe = function buyLicenseStripe (data) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
    locale: 'auto',
    token: function(token) {
      requestJSON({
        url: endpoint + '/self/license/buy',
        method: "POST",
        data: {
          method: 'stripe',
          token: token,
          license: data
        }
      }, function (err, body, xhr) {
        if (err) {
          window.alert(err.message)
          return
        }
        go('/license-bought')
      })
    }
  })

  handler.open({
    name: data.vendor + ' Whitelist',
    description: 'For "' + data.identity + '"',
    amount: 20000,
    email: session.user.email,
    panelLabel: "Pay {{amount}}"
  })
}

function checkoutSubscriptions (e, el) {
  var els = toArray(document.querySelectorAll('[role="new-subs"] tr') || [])
  var subs = els.map(getDataSet)
  if (!subs.length) return
  var data = getTargetDataSet(el)
  if (!isValidPayMethod(data.method)) return
  checkoutSubscriptions[data.method](data, subs)
}

checkoutSubscriptions.stripe = function checkoutSubscriptionsStripe (data, subs) {
  requestJSON({
    url: endpoint + '/self/subscription/services',
    method: 'POST',
    data: {
      provider: 'paypal',
      returnUrl: location.origin + '/subscribed',
      cancelUrl: location.origin + '/canceled-payment',
      services: subs
    }
  }, function (err, body, xhr) {
    if (err) return window.alert(err.message)
    window.location = body.redirect
  })
}

checkoutSubscriptions.stripe = function checkoutSubscriptionsStripe (data, subs) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
    locale: 'auto',
    token: function(token) {
      requestJSON({
        url: endpoint + '/self/subscription/services',
        method: 'POST',
        data: {
          provider: 'stripe',
          token: token,
          services: subs
        }
      }, function (err, body, xhr) {
        if (err) {
          window.alert(err.message)
          return
        }
        go('/subscribed')
      })
    }
  })

  var cost = subs.reduce(function (prev, cur) {
    return prev + cur.amount
  }, 0)
  handler.open({
    name: 'Monstercat',
    description: 'Subscription Services',
    amount: cost,
    email: session.user.email,
    panelLabel: "Subscribe {{amount}}"
  })
}

function unsubscribeGold (e, el) {
  requestJSON({
    url: endpoint + '/self/subscription/gold/cancel',
    method: "POST"
  }, function (err, body, xhr) {
    if (err) {
      window.alert(err.message)
      return
    }
    go('/unsubscribed')
  })
}

function redirectServices (e, el) {
  window.location = location.origin + '/services'
}

/* UI Stuff */

function showNewSubscriptions () {
  document.querySelector('#new-subscriptions').classList.remove('hide')
}

function reachedMaxCartSubscriptions () {
  return (document.querySelectorAll('[role="new-subs"] tr') || []).length >= 5
}

function addSub (obj) {
  var t = getTemplateEl('subscription-row')
  var container = document.querySelector('[role="new-subs"]')
  var div = document.createElement('tbody')
  render(div, t.textContent, obj)
  container.appendChild(div.firstElementChild)
}

function removeSub (e, el) {
  e.path.forEach(function (el) {
    if (el.tagName && el.tagName.toLowerCase() == 'tr')
      el.parentElement.removeChild(el)
  })
}

function subscribeGold (e, el) {
  if (reachedMaxCartSubscriptions())
    return window.alert("You can only purchase up to 5 subscriptions at a time.")
  addSub({
    name: "Gold Membership",
    cost: "5.00",
    fields: [
      { key: "name", value: "Gold Membership" },
      { key: "type", value: "gold" },
      { key: "amount", value: 500 }
    ]
  })
  el.disabled = true
  el.textContent = "Added - See Below"
  showNewSubscriptions()
  toast({message: "Gold Membership added to cart. See bottom of page."})
}

function alreadyInCart (data) {
  return !!document.querySelector('[type="hidden"][value="'+data.vendor+'"]') &&
    !!document.querySelector('[type="hidden"][value="'+data.identity+'"]')
}

function subscribeNewLicense (e, el) {
  if (reachedMaxCartSubscriptions())
    return window.alert("You can only purchase up to 5 subscriptions at a time.")

  var data = getTargetDataSet(el)
  if (!data) return
  if (!data.vendor) return
  if (!data.identity) return

  if (alreadyInCart(data))
    return window.alert("This license is already in the cart.")

  var name = "Whitelisting for " + data.identity + " on " + data.vendor
  addSub({
    name: name,
    cost: "5.00",
    fields: [
      { key: "amount", value: 500 },
      { key: "type", value: 'whitelist'},
      { key: "vendor", value: data.vendor },
      { key: "identity", value: data.identity }
    ]
  })
  showNewSubscriptions()
  toast({
    message: name + ' added to cart. See bottom of page.'
  })
}
