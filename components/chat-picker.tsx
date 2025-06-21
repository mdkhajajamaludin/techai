import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import { LLMModel, LLMModelConfig } from '@/lib/models'
import { TemplateId, Templates } from '@/lib/templates'
import 'core-js/features/object/group-by.js'
import { BrainCircuit, ChevronDown, Lightbulb, Search } from 'lucide-react'
import Image from 'next/image'
import { Button } from './ui/button'

export function ChatPicker({
  templates,
  selectedTemplate,
  onSelectedTemplateChange,
  models,
  languageModel,
  onLanguageModelChange,
}: {
  templates: Templates
  selectedTemplate: 'auto' | TemplateId
  onSelectedTemplateChange: (template: 'auto' | TemplateId) => void
  models: LLMModel[]
  languageModel: LLMModelConfig
  onLanguageModelChange: (config: LLMModelConfig) => void
}) {
  return (
    <div className="flex items-center justify-between w-full flex-wrap gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant="ghost" size="sm" className="rounded-full px-2 sm:px-3 h-8 flex items-center gap-1 text-muted-foreground">
          <Search className="h-4 w-4 min-w-4" />
          <span className="text-sm font-normal hidden sm:inline">DeepSearch</span>
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      
        <Button variant="ghost" size="sm" className="rounded-full px-2 sm:px-3 h-8 flex items-center gap-1 text-muted-foreground">
          <Lightbulb className="h-4 w-4 min-w-4" />
          <span className="text-sm font-normal hidden sm:inline">Think</span>
        </Button>
      </div>
      
      <div className="flex items-center">
        <Select
          name="languageModel"
          defaultValue={languageModel.model}
          onValueChange={(e) => onLanguageModelChange({ model: e })}
        >
          <SelectTrigger className="border-none shadow-none focus:ring-0 h-8 px-1 sm:px-2 font-normal text-muted-foreground text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <span>Grok 3</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              <SelectLabel>Available Models</SelectLabel>
              {models?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center space-x-2">
                    <Image
                      className="flex"
                      src={`/thirdparty/logos/${model.providerId}.svg`}
                      alt={model.provider}
                      width={14}
                      height={14}
                    />
                    <span>{model.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
