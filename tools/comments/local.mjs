import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
export function localServices(projectId='demo-serhii-comments') {
  if(!/^demo-[a-z0-9-]+$/.test(projectId))throw Error('Only isolated demo-* projects are supported by this tool');
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
  for(const name of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'])if(!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[name]))throw Error('Only loopback emulators are supported');
  const app=initializeApp({projectId},projectId+'-'+Math.random().toString(36).slice(2));
  return {app,db:getFirestore(app),auth:getAuth(app)};
}
