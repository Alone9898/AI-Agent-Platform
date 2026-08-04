import { agentApi, skillApi } from '@/api'
import {
  agentPresetStorageKey,
  LOCAL_AGENT_PRESETS,
  type LocalAgentPreset,
} from '@/presets/agent-presets'

function getSkillToolNames(skill: any): string[] {
  try {
    const tools = typeof skill?.tools === 'string' ? JSON.parse(skill.tools) : skill?.tools
    if (!Array.isArray(tools)) return []
    return tools
      .map((tool: any) => tool?.name)
      .filter((name: unknown): name is string => typeof name === 'string')
  } catch {
    return []
  }
}

export function findPresetAgent(preset: LocalAgentPreset, agents: any[]) {
  const storedId = Number(localStorage.getItem(agentPresetStorageKey(preset.key)))
  const storedAgent = Number.isFinite(storedId)
    ? agents.find((agent) => agent.id === storedId)
    : null
  return storedAgent || agents.find((agent) =>
    agent.name === preset.name || preset.legacyNames?.includes(agent.name),
  ) || null
}

export function rememberPresetAgent(preset: LocalAgentPreset, agentId: number) {
  localStorage.setItem(agentPresetStorageKey(preset.key), String(agentId))
}

export function forgetPresetAgent(agentId: number) {
  for (const preset of LOCAL_AGENT_PRESETS) {
    const storageKey = agentPresetStorageKey(preset.key)
    if (localStorage.getItem(storageKey) === String(agentId)) {
      localStorage.removeItem(storageKey)
    }
  }
}

export async function createAgentFromPreset(preset: LocalAgentPreset, modelId: number) {
  let skills: any[] = []
  let availablePresets: any[] = []
  if (preset.requiredSkills.length) {
    const [{ data: existingSkills }, { data: skillPresets }] = await Promise.all([
      skillApi.findAll(),
      skillApi.getPresets(),
    ])
    skills = Array.isArray(existingSkills) ? [...existingSkills] : []
    availablePresets = Array.isArray(skillPresets) ? skillPresets : []
  }
  const skillIds: number[] = []

  for (const requirement of preset.requiredSkills) {
    let skill = skills.find((item: any) =>
      getSkillToolNames(item).includes(requirement.toolName),
    )
    if (!skill) {
      const skillPreset = availablePresets.find((item: any) => item.key === requirement.presetKey)
      if (!skillPreset) throw new Error(`缺少工具模板：${requirement.toolName}`)
      const { data } = await skillApi.create({
        name: skillPreset.name,
        description: skillPreset.description,
        type: skillPreset.type || 'prompt',
        prompt: skillPreset.prompt,
        tools: skillPreset.tools,
      })
      skill = data
      skills.push(skill)
    }
    skillIds.push(skill.id)
  }

  let createdAgent: any = null
  try {
    const { data } = await agentApi.create({
      name: preset.name,
      description: preset.description,
      systemPrompt: preset.systemPrompt,
    })
    createdAgent = data
    await agentApi.bindModel(createdAgent.id, modelId)
    if (skillIds.length) {
      await agentApi.bindSkills(createdAgent.id, [...new Set(skillIds)])
    }
    rememberPresetAgent(preset, createdAgent.id)
    return createdAgent
  } catch (error) {
    if (createdAgent?.id) {
      try {
        await agentApi.remove(createdAgent.id)
      } catch {
        // Preserve the original creation error.
      }
    }
    throw error
  }
}
