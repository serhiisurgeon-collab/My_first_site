import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSettings,updatedSettings,validateSettings} from '../../js/comments/settings.js';
const legacy=enabled=>({enabled,moderationMode:'pre',schemaVersion:1});
test('legacy enabled discussions remain visible, disabled legacy discussions remain hidden',()=>{
 assert.equal(normalizeSettings(legacy(true)).visibility,'visible');
 assert.equal(normalizeSettings(legacy(false)).visibility,'hidden');
});
test('read-only migration is explicit and does not mutate legacy input',()=>{
 const old=legacy(false),next=updatedSettings(old,{visibility:'visible'});
 assert.deepEqual(next,{enabled:false,visibility:'visible',moderationMode:'pre',schemaVersion:2});
 assert.deepEqual(old,legacy(false));
});
test('hiding forces posting off and revealing does not re-enable it',()=>{
 const hidden=updatedSettings(legacy(true),{visibility:'hidden'});
 assert.equal(hidden.enabled,false);
 assert.equal(updatedSettings(hidden,{visibility:'visible'}).enabled,false);
});
test('invalid and future settings fail closed',()=>{
 for(const invalid of [{...legacy(true),schemaVersion:3},{...legacy(true),visibility:'visible'},
  {enabled:true,visibility:'hidden',moderationMode:'pre',schemaVersion:2},
  {enabled:false,visibility:'invalid',moderationMode:'pre',schemaVersion:2}]){
  assert.equal(validateSettings(invalid),false);assert.throws(()=>normalizeSettings(invalid));
 }
 assert.throws(()=>updatedSettings(legacy(true),{unknown:true}));
});
