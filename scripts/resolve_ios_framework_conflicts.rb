def resolve_ios_framework_conflicts(installer)
  shared_hypersdk_frameworks = %w[HyperSDK HyperCore JuspaySafeBrowser]

  installer.aggregate_targets.each do |aggregate_target|
    target_name = aggregate_target.name

    %w[Debug Release].each do |config|
      %w[input output].each do |list_type|
        xcfilelist = File.join(
          installer.sandbox.root.to_s,
          "Target Support Files/#{target_name}/#{target_name}-frameworks-#{config}-#{list_type}-files.xcfilelist"
        )
        next unless File.exist?(xcfilelist)
        lines = File.readlines(xcfilelist)
        filtered = lines.reject { |l| shared_hypersdk_frameworks.any? { |fw| l.include?(fw) } }
        File.write(xcfilelist, filtered.join)
      end
    end

    frameworks_script = File.join(
      installer.sandbox.root.to_s,
      "Target Support Files/#{target_name}/#{target_name}-frameworks.sh"
    )
    next unless File.exist?(frameworks_script)
    content = File.read(frameworks_script)
    shared_hypersdk_frameworks.each do |fw|
      content = content.gsub(/^\s*install_framework[^\n]*#{fw}[^\n]*\n/, '')
    end
    File.write(frameworks_script, content)
  end

  # Add Fuse.rb as a build script phase so HyperSDK assets are downloaded
  # automatically before every build without any manual Xcode scheme setup.
  fuse_phase_name = '[HyperSDK] Download Assets'
  fuse_script = 'ruby "${PODS_ROOT}/HyperSDK/Fuse.rb"'

  installer.aggregate_targets.each do |aggregate_target|
    next if aggregate_target.user_targets.empty?

    aggregate_target.user_targets.each do |user_target|
      next if user_target.shell_script_build_phases.any? { |p| p.name == fuse_phase_name }

      phase = user_target.new_shell_script_build_phase(fuse_phase_name)
      phase.shell_script = fuse_script
      phase.show_env_vars_in_log = '0'

      # Place before the Sources compile phase so the header exists at compile time
      sources_phase = user_target.build_phases.find do |p|
        p.is_a?(Xcodeproj::Project::Object::PBXSourcesBuildPhase)
      end
      if sources_phase
        phases = user_target.build_phases
        phases.delete(phase)
        phases.insert(phases.index(sources_phase), phase)
      end
    end

    aggregate_target.user_project.save
  end
end
