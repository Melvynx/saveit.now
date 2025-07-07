#!/usr/bin/env node

/**
 * Script to check Vercel deployment status and get build errors
 * Usage: node scripts/check-deployment.js [deployment-url-or-id]
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const deploymentId = args[0];

if (!deploymentId) {
  console.error('Usage: node scripts/check-deployment.js [deployment-url-or-id]');
  console.error('Example: node scripts/check-deployment.js https://your-app-xyz.vercel.app');
  console.error('Example: node scripts/check-deployment.js dpl_xyz123');
  process.exit(1);
}

async function checkDeployment(deploymentId) {
  try {
    console.log(`🔍 Checking deployment: ${deploymentId}`);
    console.log('=' .repeat(50));

    // Get deployment info
    const deploymentInfo = execSync(`vercel inspect ${deploymentId} --json`, { encoding: 'utf-8' });
    const deployment = JSON.parse(deploymentInfo);

    console.log(`📍 URL: ${deployment.url}`);
    console.log(`📊 Status: ${deployment.readyState}`);
    console.log(`🏗️  Build ID: ${deployment.id}`);
    console.log(`📅 Created: ${new Date(deployment.createdAt).toLocaleString()}`);
    console.log(`🌍 Region: ${deployment.regions?.[0] || 'N/A'}`);

    if (deployment.readyState === 'ERROR') {
      console.log('\n❌ Deployment failed!');
      
      // Get build logs
      console.log('\n📋 Getting build logs...');
      try {
        const logs = execSync(`vercel logs ${deploymentId}`, { encoding: 'utf-8' });
        console.log('\n🔍 Build Logs:');
        console.log('-'.repeat(50));
        console.log(logs);
      } catch (error) {
        console.error('Failed to get logs:', error.message);
      }

      // Get deployment details with builds
      try {
        const buildsInfo = execSync(`vercel inspect ${deploymentId} --json`, { encoding: 'utf-8' });
        const builds = JSON.parse(buildsInfo);
        
        if (builds.builds && builds.builds.length > 0) {
          console.log('\n🏗️  Build Details:');
          console.log('-'.repeat(50));
          builds.builds.forEach((build, index) => {
            console.log(`Build ${index + 1}:`);
            console.log(`  Status: ${build.readyState}`);
            console.log(`  Use: ${build.use}`);
            console.log(`  Created: ${new Date(build.createdAt).toLocaleString()}`);
            if (build.readyState === 'ERROR') {
              console.log(`  ❌ Build failed`);
            }
          });
        }
      } catch (error) {
        console.error('Failed to get build details:', error.message);
      }

    } else if (deployment.readyState === 'READY') {
      console.log('\n✅ Deployment successful!');
      console.log(`🌐 Visit: https://${deployment.url}`);
    } else if (deployment.readyState === 'BUILDING') {
      console.log('\n🔄 Deployment is still building...');
    } else {
      console.log(`\n📊 Deployment status: ${deployment.readyState}`);
    }

    // Check for functions if any
    if (deployment.functions && deployment.functions.length > 0) {
      console.log('\n⚡ Functions:');
      deployment.functions.forEach(func => {
        console.log(`  - ${func.name}: ${func.readyState}`);
      });
    }

    return deployment;

  } catch (error) {
    console.error('❌ Error checking deployment:', error.message);
    
    // If it's a JSON parsing error, show the raw output
    if (error.message.includes('JSON')) {
      try {
        const rawOutput = execSync(`vercel inspect ${deploymentId}`, { encoding: 'utf-8' });
        console.log('\n📋 Raw output:');
        console.log(rawOutput);
      } catch (rawError) {
        console.error('Failed to get raw output:', rawError.message);
      }
    }
    
    process.exit(1);
  }
}

// Also provide a function to get recent deployments
async function getRecentDeployments() {
  try {
    console.log('\n📋 Recent deployments:');
    console.log('=' .repeat(50));
    
    const deploymentsList = execSync('vercel list --json', { encoding: 'utf-8' });
    const deployments = JSON.parse(deploymentsList);
    
    if (deployments.deployments && deployments.deployments.length > 0) {
      deployments.deployments.slice(0, 10).forEach((deployment, index) => {
        const status = deployment.readyState;
        const statusIcon = status === 'READY' ? '✅' : status === 'ERROR' ? '❌' : status === 'BUILDING' ? '🔄' : '📊';
        console.log(`${index + 1}. ${statusIcon} ${deployment.url} (${status})`);
        console.log(`   ID: ${deployment.uid}`);
        console.log(`   Created: ${new Date(deployment.createdAt).toLocaleString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Failed to get recent deployments:', error.message);
  }
}

// If no deployment ID provided, show recent deployments
if (deploymentId === 'list' || deploymentId === '--list') {
  getRecentDeployments();
} else {
  checkDeployment(deploymentId);
}