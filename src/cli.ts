#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig, getGlobalConfigPath, getProjectConfigPath } from './config/loader';
import { loadSkills } from './skills/loader';
import { listPlans } from './planner/plan-manager';
import * as path from 'path';

const program = new Command();

program
  .name('pro0')
  .description('PRO0 - A simpler, better agent harness')
  .version('0.1.0');

program
  .command('config')
  .description('Show current configuration')
  .option('-g, --global', 'Show global config path')
  .option('-p, --project', 'Show project config path')
  .action((options) => {
    if (options.global) {
      console.log(`Global config: ${getGlobalConfigPath()}`);
      return;
    }

    if (options.project) {
      const projectRoot = process.cwd();
      console.log(`Project config: ${getProjectConfigPath(projectRoot)}`);
      return;
    }

    const projectRoot = process.cwd();
    const config = loadConfig(projectRoot);
    console.log(JSON.stringify(config, null, 2));
  });

program
  .command('skills')
  .description('List installed skills')
  .action(() => {
    const projectRoot = process.cwd();
    const config = loadConfig(projectRoot);
    const skills = loadSkills(projectRoot, config.skills?.disabled);

    if (skills.length === 0) {
      console.log('No skills installed.');
      return;
    }

    console.log(`Found ${skills.length} skill(s):\n`);
    skills.forEach((skill) => {
      console.log(`  ${skill.name} (v${skill.manifest.version})`);
      if (skill.manifest.description) {
        console.log(`    ${skill.manifest.description}`);
      }
      console.log(`    Path: ${skill.path}\n`);
    });
  });

program
  .command('plans')
  .description('List all plans in current project')
  .action(() => {
    const projectRoot = process.cwd();
    const plans = listPlans(projectRoot);

    if (plans.length === 0) {
      console.log('No plans found in .pro0/plans/');
      return;
    }

    console.log(`Found ${plans.length} plan(s):\n`);
    plans.forEach((plan) => {
      console.log(`  ${plan.id}`);
      console.log(`    Title: ${plan.title}`);
      console.log(`    Created: ${plan.createdAt.toLocaleString()}`);
      console.log(`    Path: ${plan.filePath}\n`);
    });
  });

program
  .command('init')
  .description('Initialize PRO0 in current project')
  .action(() => {
    const projectRoot = process.cwd();
    const configDir = path.join(projectRoot, '.opencode');
    const plansDir = path.join(projectRoot, '.pro0', 'plans');

    const fs = require('fs');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`✅ Created ${configDir}`);
    }

    if (!fs.existsSync(plansDir)) {
      fs.mkdirSync(plansDir, { recursive: true });
      console.log(`✅ Created ${plansDir}`);
    }

    console.log('\n✅ PRO0 initialized successfully!');
    console.log(`\nNext steps:`);
    console.log(`  1. Review global config: ${getGlobalConfigPath()}`);
    console.log(`  2. (Optional) Create project config: ${getProjectConfigPath(projectRoot)}`);
    console.log(`  3. Start using PRO0 agents in your project`);
  });

program.parse();
