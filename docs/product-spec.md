––––––––––––
claude.md
NailBook — V1 Product Guardrails & Feature Spec
––––––––––––

purpose of this file

This file defines the authoritative V1 scope for NailBook.

Claude must:

follow this document strictly

not invent features outside this scope

not “optimize” by adding complexity

ask before expanding scope

If something is not listed here, it is out of scope for V1.

––––––––––––

product summary

NailBook is a mobile-first nail booking and payments platform with a public booking web flow optimized for social traffic.

Providers operate inside the mobile app.
Clients can book instantly through a provider’s public link without installing the app.

This is not a general scheduling tool.

––––––––––––

core principles (non-negotiable)

mobile-first design

public booking does NOT require app install

clear money visibility at every step

no forced payment methods

provider-first control

minimal, calm UI

human escalation for money/security

no silent data deletion

––––––––––––

product surfaces
1. mobile app (primary)

iOS first

used mainly by providers

also used by repeat clients

2. public booking web flow (critical)

opens from provider’s social bio link

mobile-optimized

booking in under 60–90 seconds

no forced signup

no forced app download

Desktop is supported but not optimized.

––––––––––––

user roles

provider (nail tech)

client (customer)

admin (internal)

––––––––––––

provider features (mobile app – V1)
profile & presence

public provider profile

bio, location, hours

cover image

social links (Instagram, TikTok)

manual provider verification badge (admin-granted)

portfolio

visual portfolio (photo + video grid)

upload from camera or gallery

portfolio-first layout

services & scheduling

service menu builder

price

duration

add-ons

availability scheduler

weekly schedule

block-off dates

instant book vs request approval toggle

public booking link (shareable, bio-ready)

appointments

view, accept, cancel, reschedule

full appointment activity log

client visit history

client notes per appointment

“new client” indicator

payments & money control

provider-controlled payment methods:

card

Apple Pay

Google Pay

Cash App Pay

cash allowed

deposits per service (flat or %)

cancellation & no-show rules

deposit outcome visibility:

kept

refunded

failed

payment states:

pending

completed

failed

transaction ledger with timestamps

payout visibility:

initiated

processing

completed

CSV export of transactions

communication

basic in-app messaging

messages tied to appointments

no typing indicators

no read receipts

––––––––––––

client features (mobile app – V1)

simple account creation

location-based discovery

style & specialty filters

portfolio-first browsing

provider profile viewing

favorites / saved providers

booking inside app

saved payment methods

appointment history

easy rebooking

push notifications

in-app messaging

reviews only after completed appointments

––––––––––––

public booking web flow (V1 – critical)
provider page

profile info

services

portfolio preview

verification badge (if applicable)

booking flow

select service

select time

view deposit & policies

optional required inspiration photo (provider toggle)

payment methods:

card

Apple Pay

Google Pay

Cash App Pay

cash services clearly labeled

arrival grace period displayed

booking confirmation

post-booking

confirmation page

add to calendar

optional account creation

optional app download prompt (never forced)

––––––––––––

notifications (V1)

push notifications (app users)

email notifications (web users)

automated appointment reminders

follow-up / rebooking reminders

system notifications for changes

––––––––––––

trust, safety & support

optional biometric login (app)

long-lived sessions

user-visible account activity logs

reviews only after completed appointments

review evidence submission

manual dispute flagging

human escalation for:

payments

fraud

account access

provider data export:

clients

appointments

transactions

no silent data deletion

––––––––––––

discovery & marketplace (limited V1)

discovery feed (providers + recent work)

sort by:

proximity

availability

no paid boosts

no trending algorithms

––––––––––––

explicitly out of scope for V1

Do NOT build or suggest:

two-way calendar sync

analytics dashboards

loyalty or rewards

gift cards

waitlists

boosted listings

subscriptions

instant payouts

inventory or expense tracking

education marketplace

expansion beyond nails

––––––––––––

success criteria

V1 is successful if:

providers onboard and share a booking link in under 10 minutes

first-time clients book from social without installing the app

payment outcomes are never ambiguous

providers trust NailBook with money handling

users describe NailBook as “easy,” “clear,” and “made for nail techs”

Any UI work must comply with ui.md. If a requested UI change conflicts, flag it instead of implementing.